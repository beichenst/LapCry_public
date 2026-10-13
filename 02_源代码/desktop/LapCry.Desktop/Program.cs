using System.Diagnostics;
using System.Threading;

namespace LapCry.Desktop;

internal static class Program
{
    private const string MutexName = "Bin9chn.LapCry.Desktop.SingleInstance";

    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, MutexName, out var isFirstInstance);
        if (!isFirstInstance)
        {
            BringExistingInstanceToFront();
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.ThreadException += (_, args) => ShowFatalError(args.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
            ShowFatalError(args.ExceptionObject as Exception ?? new Exception("Unknown startup error."));

        try
        {
            Application.Run(new MainForm());
        }
        catch (Exception ex)
        {
            ShowFatalError(ex);
        }
    }

    private static void BringExistingInstanceToFront()
    {
        try
        {
            var current = Process.GetCurrentProcess();
            var existing = Process.GetProcessesByName(current.ProcessName)
                .FirstOrDefault(process => process.Id != current.Id);

            if (existing is not null && existing.MainWindowHandle != IntPtr.Zero)
            {
                NativeMethods.ShowWindow(existing.MainWindowHandle, NativeMethods.SW_RESTORE);
                NativeMethods.SetForegroundWindow(existing.MainWindowHandle);
            }
        }
        catch
        {
            // A second instance should exit quietly when window activation is unavailable.
        }
    }

    private static void ShowFatalError(Exception exception)
    {
        MessageBox.Show(
            $"LapCry could not start.\n\n{exception.Message}",
            "LapCry",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
    }
}
