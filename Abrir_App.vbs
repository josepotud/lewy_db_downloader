Set WshShell = CreateObject("WScript.Shell")
Dim fso, currentDir, htmlPath, edgePath1, edgePath2

Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
htmlPath = "file:///" & Replace(currentDir & "\index.html", "\", "/")

edgePath1 = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
edgePath2 = WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"

If fso.FileExists(edgePath1) Then
    WshShell.Run """" & edgePath1 & """ --app=""" & htmlPath & """", 1, False
ElseIf fso.FileExists(edgePath2) Then
    WshShell.Run """" & edgePath2 & """ --app=""" & htmlPath & """", 1, False
Else
    WshShell.Run """" & currentDir & "\index.html""", 1, False
End If
