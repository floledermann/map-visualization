@http-server . -p 8081
@if %ERRORLEVEL% NEQ 0 (
  @echo.
  echo ####################################################################
  echo # node.js webserver not found                                      #
  echo # Please install node webserver using "npm install http-server -g" #
  echo ####################################################################
)
pause
