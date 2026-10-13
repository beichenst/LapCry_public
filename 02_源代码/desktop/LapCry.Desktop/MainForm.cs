using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace LapCry.Desktop;

internal sealed class MainForm : Form
{
    private static readonly Size InitialWindowSize = new(1440, 900);
    private static readonly Size MinimumUsableSize = new(900, 600);
    private const int WorkspaceMargin = 24;

    private readonly WebView2 _webView = new();
    private LocalStaticServer? _server;
    private bool _closing;

    public MainForm()
    {
        AutoScaleMode = AutoScaleMode.Dpi;
        Text = "LapCry";
        FormBorderStyle = FormBorderStyle.Sizable;
        MaximizeBox = true;
        MinimizeBox = true;
        StartPosition = FormStartPosition.Manual;
        MinimumSize = new Size(640, 480);
        Size = InitialWindowSize;
        BackColor = Color.FromArgb(12, 18, 29);
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);

        _webView.Dock = DockStyle.Fill;
        _webView.DefaultBackgroundColor = Color.FromArgb(12, 18, 29);
        Controls.Add(_webView);

        Load += (_, _) => ApplyScreenBounds();
        Shown += async (_, _) => await InitialiseBrowserAsync();
        FormClosing += OnFormClosing;
    }

    private void ApplyScreenBounds()
    {
        var area = Screen.FromControl(this).WorkingArea;
        var maxWidth = Math.Max(640, area.Width - (WorkspaceMargin * 2));
        var maxHeight = Math.Max(480, area.Height - (WorkspaceMargin * 2));
        var minWidth = Math.Min(MinimumUsableSize.Width, maxWidth);
        var minHeight = Math.Min(MinimumUsableSize.Height, maxHeight);

        MinimumSize = new Size(minWidth, minHeight);
        Size = new Size(
            Math.Min(InitialWindowSize.Width, maxWidth),
            Math.Min(InitialWindowSize.Height, maxHeight));
        Location = new Point(
            area.Left + ((area.Width - Width) / 2),
            area.Top + ((area.Height - Height) / 2));
        MaximizedBounds = area;
    }

    protected override void OnMove(EventArgs e)
    {
        base.OnMove(e);
        if (IsHandleCreated) MaximizedBounds = Screen.FromControl(this).WorkingArea;
    }

    private async Task InitialiseBrowserAsync()
    {
        string webRoot;
        try
        {
            webRoot = WebAssetExtractor.EnsureExtracted();
        }
        catch (Exception ex)
        {
            ShowStartupError($"LapCry could not prepare its embedded resources.\n\n{ex.Message}");
            Close();
            return;
        }

        if (!File.Exists(Path.Combine(webRoot, "index.html")))
        {
            MessageBox.Show(
                "LapCry embedded web resources are incomplete.\n\n" +
                $"Expected: {Path.Combine(webRoot, "index.html")}",
                "LapCry",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
            return;
        }

        try
        {
            _server = new LocalStaticServer(webRoot);
            _server.Start();

            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "LapCry",
                "WebView2");
            Directory.CreateDirectory(userDataFolder);

            var environment = await CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: null,
                userDataFolder: userDataFolder,
                options: null);
            await _webView.EnsureCoreWebView2Async(environment);
            ConfigureWebView();
            _webView.Source = _server.BaseUri;
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowStartupError(
                "Microsoft Edge WebView2 Runtime is not installed.\n\n" +
                "Install the Evergreen WebView2 Runtime and start LapCry again.");
        }
        catch (Exception ex)
        {
            ShowStartupError($"LapCry could not initialise its desktop engine.\n\n{ex.Message}");
        }
    }

    private void ConfigureWebView()
    {
        var settings = _webView.CoreWebView2.Settings;
        settings.AreDefaultContextMenusEnabled = true;
        settings.AreBrowserAcceleratorKeysEnabled = true;
        settings.AreDevToolsEnabled = false;
        settings.IsStatusBarEnabled = false;
        settings.IsZoomControlEnabled = true;
        settings.IsPasswordAutosaveEnabled = false;
        settings.IsGeneralAutofillEnabled = false;
        settings.IsWebMessageEnabled = false;
        settings.IsBuiltInErrorPageEnabled = false;

        _webView.CoreWebView2.NavigationStarting += OnNavigationStarting;
        _webView.CoreWebView2.NewWindowRequested += OnNewWindowRequested;
        _webView.CoreWebView2.PermissionRequested += OnPermissionRequested;
        _webView.CoreWebView2.DocumentTitleChanged += (_, _) =>
        {
            if (!string.IsNullOrWhiteSpace(_webView.CoreWebView2.DocumentTitle))
                Text = _webView.CoreWebView2.DocumentTitle;
        };
        _webView.CoreWebView2.ProcessFailed += OnProcessFailed;
    }

    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri)) return;

        if (IsApplicationUri(uri)) return;

        e.Cancel = true;
        OpenExternal(uri);
    }

    private void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        if (Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri))
            OpenExternal(uri);
    }

    private void OnPermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs e)
    {
        e.State = CoreWebView2PermissionState.Deny;
    }

    private void OnProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
    {
        if (_closing) return;
        ShowStartupError($"The LapCry rendering process stopped unexpectedly.\n\nReason: {e.Reason}");
    }

    private bool IsApplicationUri(Uri uri)
    {
        if (_server is null) return false;
        return uri.Scheme == Uri.UriSchemeHttp &&
            uri.Host == "127.0.0.1" &&
            uri.Port == _server.BaseUri.Port;
    }

    private static void OpenExternal(Uri uri)
    {
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return;

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri)
            {
                UseShellExecute = true
            });
        }
        catch
        {
            // Opening external applications is best-effort.
        }
    }

    private static void ShowStartupError(string message)
    {
        MessageBox.Show(message, "LapCry", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        _closing = true;
        DisposeServer();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _closing = true;
            _webView.Dispose();
            DisposeServer();
        }
        base.Dispose(disposing);
    }

    private void DisposeServer()
    {
        if (_server is null) return;
        try
        {
            _server.DisposeAsync().AsTask().GetAwaiter().GetResult();
        }
        catch
        {
            // Shutdown must continue even if a socket is already closed.
        }
        finally
        {
            _server = null;
        }
    }
}
