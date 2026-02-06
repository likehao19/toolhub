; Vue3 Tauri Desktop App NSIS 安装脚本
; 此脚本配置 Windows 安装程序的外观和行为

!include "MUI2.nsh"
!include "FileFunc.nsh"

; 安装程序信息
Name "${PRODUCTNAME}"
OutFile "${OUTFILE}"
InstallDir "$PROGRAMFILES64\${PRODUCTNAME}"
InstallDirRegKey HKLM "Software\${PRODUCTNAME}" "InstallDir"
RequestExecutionLevel admin

; 界面设置
!define MUI_ABORTWARNING
!define MUI_ICON "${ICONPATH}"
!define MUI_UNICON "${ICONPATH}"

; 自定义安装程序图片
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\installer\images\installer-header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\installer\images\installer-sidebar.bmp"

; 安装页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${LICENSEPATH}"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; 完成页面设置
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCTNAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "运行 ${PRODUCTNAME}"
!insertmacro MUI_PAGE_FINISH

; 卸载页面
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 语言
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; 安装组件
Section "!${PRODUCTNAME} (必需)" SecMain
  SectionIn RO

  SetOutPath "$INSTDIR"

  ; 写入安装文件
  File /r "${RESOURCESPATH}\*.*"

  ; 创建卸载程序
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; 写入注册表
  WriteRegStr HKLM "Software\${PRODUCTNAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}" "DisplayName" "${PRODUCTNAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}" "DisplayIcon" "$INSTDIR\${PRODUCTNAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}" "Publisher" "${MANUFACTURER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}" "DisplayVersion" "${VERSION}"

  ; 获取安装大小
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}" "EstimatedSize" "$0"
SectionEnd

; 桌面快捷方式（可选）
Section "创建桌面快捷方式" SecDesktop
  CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCTNAME}.exe"
SectionEnd

; 开始菜单快捷方式
Section "开始菜单快捷方式" SecStartMenu
  CreateDirectory "$SMPROGRAMS\${PRODUCTNAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}\${PRODUCTNAME}.lnk" "$INSTDIR\${PRODUCTNAME}.exe"
  CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}\卸载 ${PRODUCTNAME}.lnk" "$INSTDIR\Uninstall.exe"
SectionEnd

; 开机自启动（可选）
Section "开机自动启动" SecAutoStart
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}" "$INSTDIR\${PRODUCTNAME}.exe --minimized"
SectionEnd

; 组件描述
LangString DESC_SecMain ${LANG_SIMPCHINESE} "安装 ${PRODUCTNAME} 主程序（必需）"
LangString DESC_SecMain ${LANG_ENGLISH} "Install ${PRODUCTNAME} main program (required)"

LangString DESC_SecDesktop ${LANG_SIMPCHINESE} "在桌面创建快捷方式"
LangString DESC_SecDesktop ${LANG_ENGLISH} "Create desktop shortcut"

LangString DESC_SecStartMenu ${LANG_SIMPCHINESE} "在开始菜单创建快捷方式"
LangString DESC_SecStartMenu ${LANG_ENGLISH} "Create start menu shortcuts"

LangString DESC_SecAutoStart ${LANG_SIMPCHINESE} "开机时自动启动程序（最小化到托盘）"
LangString DESC_SecAutoStart ${LANG_ENGLISH} "Auto start on system boot (minimized to tray)"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu} $(DESC_SecStartMenu)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecAutoStart} $(DESC_SecAutoStart)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; 卸载程序
Section "Uninstall"
  ; 删除文件
  RMDir /r "$INSTDIR"

  ; 删除快捷方式
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCTNAME}\${PRODUCTNAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCTNAME}\卸载 ${PRODUCTNAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCTNAME}"

  ; 删除注册表
  DeleteRegKey HKLM "Software\${PRODUCTNAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}"
SectionEnd

; 安装前检查
Function .onInit
  ; 检查是否已安装
  ReadRegStr $0 HKLM "Software\${PRODUCTNAME}" "InstallDir"
  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "${PRODUCTNAME} 已经安装在 $0.$\n$\n是否要卸载旧版本并继续安装？" \
      /SD IDYES IDYES uninst
    Abort

    uninst:
      ExecWait '"$0\Uninstall.exe" /S _?=$0'
      Delete "$0\Uninstall.exe"
      RMDir $0
  ${EndIf}
FunctionEnd
