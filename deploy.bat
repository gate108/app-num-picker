@echo off
cd /d D:\Dev\ClaudeDir\번호추첨\lotto-picker
copy /Y "%USERPROFILE%\Downloads\lotto_picker.jsx" src\App.jsx
git add .
git commit -m "update: %date% %time%"
git push
echo 배포 완료!
pause