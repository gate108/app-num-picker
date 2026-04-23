@echo off
git add .
git commit -m "update: %date% %time%"
git push
echo 배포 완료!
pause