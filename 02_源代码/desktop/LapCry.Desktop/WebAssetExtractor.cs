using System.Reflection;

namespace LapCry.Desktop;

internal static class WebAssetExtractor
{
    private const string WebPrefix = "LapCry.Web.";
    private const string DocsPrefix = "LapCry.Docs.";
    private const string CompleteMarker = ".complete";

    public static string EnsureExtracted()
    {
        var assembly = typeof(WebAssetExtractor).Assembly;
        var cacheRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "LapCry",
            "runtime");
        Directory.CreateDirectory(cacheRoot);

        var target = Path.Combine(cacheRoot, BuildCacheKey(assembly));
        if (IsComplete(target))
            return target;

        var staging = Path.Combine(cacheRoot, $"{Path.GetFileName(target)}-{Guid.NewGuid():N}.tmp");
        Directory.CreateDirectory(staging);

        try
        {
            var resources = assembly.GetManifestResourceNames()
                .Where(name => name.StartsWith(WebPrefix, StringComparison.Ordinal) ||
                    name.StartsWith(DocsPrefix, StringComparison.Ordinal))
                .ToArray();

            foreach (var resourceName in resources)
            {
                var relativePath = GetRelativePath(resourceName);
                var destination = GetSafeDestination(staging, relativePath);
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);

                using var source = assembly.GetManifestResourceStream(resourceName)
                    ?? throw new InvalidOperationException($"Embedded resource is unavailable: {resourceName}");
                using var targetStream = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None);
                source.CopyTo(targetStream);
            }

            File.WriteAllText(Path.Combine(staging, CompleteMarker), resources.Length.ToString());
            if (Directory.Exists(target))
                Directory.Delete(target, recursive: true);
            Directory.Move(staging, target);
            return target;
        }
        catch
        {
            if (Directory.Exists(staging))
                Directory.Delete(staging, recursive: true);
            throw;
        }
    }

    private static string BuildCacheKey(Assembly assembly)
    {
        var executablePath = Environment.ProcessPath ?? assembly.Location;
        var executable = new FileInfo(executablePath);
        var version = assembly.GetName().Version?.ToString() ?? "unknown";
        return $"v{version}-{executable.Length}-{executable.LastWriteTimeUtc.Ticks}";
    }

    private static bool IsComplete(string path)
    {
        return File.Exists(Path.Combine(path, CompleteMarker)) &&
            File.Exists(Path.Combine(path, "index.html"));
    }

    private static string GetRelativePath(string resourceName)
    {
        if (resourceName.StartsWith(WebPrefix, StringComparison.Ordinal))
            return resourceName[WebPrefix.Length..].Replace('\\', '/');

        if (resourceName.StartsWith(DocsPrefix, StringComparison.Ordinal))
            return resourceName[DocsPrefix.Length..].Replace('\\', '/');

        throw new InvalidOperationException($"Unexpected embedded resource: {resourceName}");
    }

    private static string GetSafeDestination(string root, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) ||
            Path.IsPathRooted(relativePath) ||
            relativePath.Split('/', '\\').Any(segment => segment == ".."))
        {
            throw new InvalidOperationException($"Unsafe embedded resource path: {relativePath}");
        }

        var normalizedRoot = Path.GetFullPath(root);
        var destination = Path.GetFullPath(Path.Combine(normalizedRoot, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var relativeToRoot = Path.GetRelativePath(normalizedRoot, destination);
        if (relativeToRoot == ".." ||
            relativeToRoot.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Embedded resource escapes its destination: {relativePath}");
        }

        return destination;
    }
}
