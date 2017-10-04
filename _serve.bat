@SET HTDOCS=testcases
@SET PORT=8081

@title SERVING %~dp0%HTDOCS% on %PORT%

@start "" "http://localhost:%port%/"

@http-server . -p %PORT%
@if %ERRORLEVEL% NEQ 0 (
  @echo.
  echo ####################################################################
  echo # node.js webserver not found                                      #
  echo # Please install node webserver using "npm install http-server -g" #
  echo ####################################################################
)
pause
