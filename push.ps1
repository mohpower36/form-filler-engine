$git = "C:\Program Files\Git\cmd\git.exe"
& $git reset
& $git add .
& $git commit -m "Added Google Analytics and fixed backend responses"
& $git remote add origin https://github.com/mohpower36/form-filler-engine.git
& $git branch -M main
& $git push -u origin main -f
