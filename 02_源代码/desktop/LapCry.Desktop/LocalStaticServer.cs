using System.Net;
using System.Net.Sockets;
using System.Text;

namespace LapCry.Desktop;

internal sealed class LocalStaticServer : IAsyncDisposable
{
    private readonly string _rootPath;
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _shutdown = new();
    private Task? _listenTask;

    public LocalStaticServer(string rootPath)
    {
        _rootPath = Path.GetFullPath(rootPath);
        _listener = new TcpListener(IPAddress.Loopback, 0);
    }

    public Uri BaseUri
    {
        get
        {
            var endpoint = (IPEndPoint)_listener.LocalEndpoint;
            return new Uri($"http://127.0.0.1:{endpoint.Port}/");
        }
    }

    public void Start()
    {
        _listener.Start();
        _listenTask = ListenAsync(_shutdown.Token);
    }

    private async Task ListenAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            TcpClient client;
            try
            {
                client = await _listener.AcceptTcpClientAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (ObjectDisposedException)
            {
                break;
            }
            catch (SocketException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            _ = HandleClientAsync(client, cancellationToken);
        }
    }

    private async Task HandleClientAsync(TcpClient client, CancellationToken cancellationToken)
    {
        using (client)
        {
            client.NoDelay = true;
            await using var stream = client.GetStream();
            try
            {
                var request = await ReadRequestAsync(stream, cancellationToken).ConfigureAwait(false);
                if (request is null)
                {
                    await WriteResponseAsync(stream, 400, "Bad Request", "text/plain; charset=utf-8",
                        Encoding.UTF8.GetBytes("Bad request."), false, cancellationToken);
                    return;
                }

                if (!HttpMethods.IsGet(request.Method) && !HttpMethods.IsHead(request.Method))
                {
                    await WriteResponseAsync(stream, 405, "Method Not Allowed", "text/plain; charset=utf-8",
                        Encoding.UTF8.GetBytes("Only GET and HEAD are supported."), false, cancellationToken);
                    return;
                }

                if (!TryResolvePath(request.Path, out var filePath))
                {
                    await WriteResponseAsync(stream, 403, "Forbidden", "text/plain; charset=utf-8",
                        Encoding.UTF8.GetBytes("Forbidden."), false, cancellationToken);
                    return;
                }

                if (!File.Exists(filePath))
                {
                    await WriteResponseAsync(stream, 404, "Not Found", "text/plain; charset=utf-8",
                        Encoding.UTF8.GetBytes("Not found."), false, cancellationToken);
                    return;
                }

                var contentType = ContentTypes.ForPath(filePath);
                await using var file = new FileStream(
                    filePath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.Read,
                    bufferSize: 64 * 1024,
                    useAsync: true);
                await WriteResponseAsync(stream, 200, "OK", contentType, file, request.Method == "HEAD", cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Application shutdown.
            }
            catch (IOException)
            {
                // The browser can close a connection while a response is in flight.
            }
        }
    }

    private static async Task<HttpRequest?> ReadRequestAsync(NetworkStream stream, CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];
        using var requestBytes = new MemoryStream();
        var headerEnd = -1;

        while (requestBytes.Length < 32 * 1024 && headerEnd < 0)
        {
            var read = await stream.ReadAsync(buffer, cancellationToken);
            if (read <= 0) return null;
            requestBytes.Write(buffer, 0, read);
            headerEnd = FindHeaderEnd(requestBytes.GetBuffer(), (int)requestBytes.Length);
        }

        if (headerEnd < 0) return null;

        var headerText = Encoding.ASCII.GetString(requestBytes.GetBuffer(), 0, headerEnd);
        var requestLine = headerText.Split("\r\n", StringSplitOptions.None).FirstOrDefault();
        if (string.IsNullOrWhiteSpace(requestLine)) return null;

        var parts = requestLine.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 3) return null;

        return new HttpRequest(parts[0].ToUpperInvariant(), parts[1]);
    }

    private static int FindHeaderEnd(byte[] bytes, int length)
    {
        for (var i = 3; i < length; i++)
        {
            if (bytes[i - 3] == '\r' && bytes[i - 2] == '\n' && bytes[i - 1] == '\r' && bytes[i] == '\n')
                return i - 3;
        }
        return -1;
    }

    private bool TryResolvePath(string requestTarget, out string filePath)
    {
        filePath = string.Empty;
        var rawPath = requestTarget.Split('?', '#')[0];
        if (string.IsNullOrEmpty(rawPath) || rawPath.Contains('\0')) return false;

        string decodedPath;
        try
        {
            decodedPath = Uri.UnescapeDataString(rawPath);
        }
        catch (UriFormatException)
        {
            return false;
        }

        var relative = decodedPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        if (string.IsNullOrEmpty(relative)) relative = "index.html";
        if (relative.Split(Path.DirectorySeparatorChar).Any(segment => segment == "..")) return false;

        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, relative));
        var relativeToRoot = Path.GetRelativePath(_rootPath, fullPath);
        if (relativeToRoot == ".." || relativeToRoot.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            return false;

        filePath = fullPath;
        return true;
    }

    private static async Task WriteResponseAsync(
        NetworkStream stream,
        int statusCode,
        string reason,
        string contentType,
        Stream body,
        bool headOnly,
        CancellationToken cancellationToken)
    {
        var headers = BuildHeaders(statusCode, reason, contentType, body.Length);
        await stream.WriteAsync(Encoding.ASCII.GetBytes(headers), cancellationToken);
        if (!headOnly)
            await body.CopyToAsync(stream, cancellationToken);
    }

    private static async Task WriteResponseAsync(
        NetworkStream stream,
        int statusCode,
        string reason,
        string contentType,
        byte[] body,
        bool headOnly,
        CancellationToken cancellationToken)
    {
        await using var bodyStream = new MemoryStream(body, writable: false);
        await WriteResponseAsync(stream, statusCode, reason, contentType, bodyStream, headOnly, cancellationToken);
    }

    private static string BuildHeaders(int statusCode, string reason, string contentType, long contentLength)
    {
        return string.Join("\r\n",
            $"HTTP/1.1 {statusCode} {reason}",
            $"Content-Type: {contentType}",
            $"Content-Length: {contentLength}",
            "Cache-Control: no-store",
            "X-Content-Type-Options: nosniff",
            "Referrer-Policy: no-referrer",
            "Cross-Origin-Resource-Policy: same-origin",
            "Content-Security-Policy: default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src * data: blob:; media-src 'self' data: blob:; object-src 'none'; frame-ancestors 'none'",
            "Connection: close",
            string.Empty,
            string.Empty);
    }

    public async ValueTask DisposeAsync()
    {
        _shutdown.Cancel();
        _listener.Stop();

        if (_listenTask is not null)
        {
            try
            {
                await _listenTask.WaitAsync(TimeSpan.FromSeconds(2)).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown.
            }
            catch (TimeoutException)
            {
                // Process shutdown must not wait indefinitely for a socket continuation.
            }
        }

        _shutdown.Dispose();
    }

    private sealed record HttpRequest(string Method, string Path);

    private static class HttpMethods
    {
        public static bool IsGet(string method) => string.Equals(method, "GET", StringComparison.Ordinal);
        public static bool IsHead(string method) => string.Equals(method, "HEAD", StringComparison.Ordinal);
    }

    private static class ContentTypes
    {
        private static readonly IReadOnlyDictionary<string, string> Types =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                [".html"] = "text/html; charset=utf-8",
                [".js"] = "application/javascript; charset=utf-8",
                [".mjs"] = "application/javascript; charset=utf-8",
                [".css"] = "text/css; charset=utf-8",
                [".json"] = "application/json; charset=utf-8",
                [".svg"] = "image/svg+xml",
                [".png"] = "image/png",
                [".jpg"] = "image/jpeg",
                [".jpeg"] = "image/jpeg",
                [".gif"] = "image/gif",
                [".ico"] = "image/x-icon",
                [".woff"] = "font/woff",
                [".woff2"] = "font/woff2",
                [".ttf"] = "font/ttf",
                [".eot"] = "application/vnd.ms-fontobject",
                [".wasm"] = "application/wasm",
                [".txt"] = "text/plain; charset=utf-8",
                [".gz"] = "application/gzip",
                [".br"] = "application/octet-stream",
                [".pdf"] = "application/pdf",
                [".xml"] = "application/xml; charset=utf-8"
            };

        public static string ForPath(string path)
        {
            var extension = Path.GetExtension(path);
            return Types.TryGetValue(extension, out var contentType)
                ? contentType
                : "application/octet-stream";
        }
    }
}
