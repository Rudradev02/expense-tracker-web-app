param([string]$ImagePath = "")
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Foundation.Metadata.ApiInformation, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
})[0]

function AwaitTask($asyncOp, $type) {
    try {
        $method = $asTaskGeneric.MakeGenericMethod($type)
        $task = $method.Invoke($null, @($asyncOp))
        $task.Wait()
        return $task.Result
    } catch {
        return $null
    }
}

if (-not (Test-Path $ImagePath)) {
    exit 1
}

$fullPath = [System.IO.Path]::GetFullPath($ImagePath)
$bytes = [System.IO.File]::ReadAllBytes($fullPath)
$memStream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
$writer = New-Object Windows.Storage.Streams.DataWriter $memStream
$writer.WriteBytes($bytes)
$null = AwaitTask ($writer.StoreAsync()) ([System.UInt32])
$null = AwaitTask ($writer.FlushAsync()) ([System.Boolean])
$memStream.Seek(0)

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
}

if ($null -eq $engine) {
    exit 2
}

$decoder = AwaitTask ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($memStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
if ($null -eq $decoder) { exit 3 }

$bitmap = AwaitTask ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
if ($null -eq $bitmap) { exit 4 }

$ocrResult = AwaitTask ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
if ($null -eq $ocrResult) { exit 5 }

Write-Output "---OCR_START---"
foreach ($line in $ocrResult.Lines) {
    Write-Output $line.Text
}
Write-Output "---OCR_END---"
