@echo off
echo ===================================
echo 🚀 EXOT Deployment Script
echo ===================================
echo.

:: 1. Check status
echo 📊 Checking changes...
git status
echo.

:: 2. Stage all
echo ➕ Staging changes...
git add .
echo.

:: 3. Commit
set /p msg="📝 Enter commit message (default: Update): "
if "%msg%"=="" set msg=Update
echo 💾 Committing with message: "%msg%"...
git commit -m "%msg%"
echo.

:: 4. Push
echo ⬆️ Pushing to GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Push to 'master' failed. Trying 'main'...
    git push origin main
)

echo.
echo ✅ Deployment process finished!
pause
