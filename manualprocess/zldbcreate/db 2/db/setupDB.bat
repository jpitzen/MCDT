@echo off
rem echo Starting MSSQLSERVER
rem net start "MSSQLSERVER"
echo.

set user=admin
set pwd=zlti123$%
set host=zldbeksdemo.cj64kwus4dat.ap-south-2.rds.amazonaws.com

set cli=sqlcmd
set cli_opts= -S %HOST% -U %USER% -P %PWD% -d zldbeksdemo

set output=logs
if not exist %output% mkdir %output%

echo Creating Server User 
%cli% -d master -S %HOST% -U %USER% -P %PWD% -i ".\crUser.sql" -o ".\logs\crUser.out"
echo.

echo Creating Database User 
%cli% %cli_opts% -i ".\crDBUser.sql" -o ".\logs\crDBUser.out"
echo.

set source=.\app
echo Creating ZipLip Tables
%cli% %cli_opts% -i "%source%\ZLSystemMSSql.sql" -o "%output%\ZLSystemMSSql.out"
%cli% %cli_opts% -i "%source%\addrBook\addrBookMsSql.sql" -o "%output%\addrBookMsSql.out"
%cli% %cli_opts% -i "%source%\classifier\ClassifierMsSql.sql" -o "%output%\ClassifierMsSql.out"
%cli% %cli_opts% -i "%source%\coordinator\coordinatorMsSql.sql" -o "%output%\coordinatorMsSql.out"
if %1x==miscx %cli% %cli_opts% -i "%source%\misc\AvIntegrationMsSql.sql" -o "%output%\AvIntegrationMsSql.out"
if %1x==miscx %cli% %cli_opts% -i "%source%\misc\AssentorMigMsSql.sql" -o "%output%\AssentorMigMsSql.out"
%cli% %cli_opts% -i "%source%\search\searchMsSql.sql" -o "%output%\searchMsSql.out"
%cli% %cli_opts% -i "%source%\storage\storageMsSql.sql" -o "%output%\storageMsSql.out"
%cli% %cli_opts% -i "%source%\storage\archive\ArchiveStorageMsSql.sql" -o "%output%\ArchiveStorageMsSql.out"
%cli% %cli_opts% -i "%source%\storage\insight\InsightStorageMsSql.sql" -o "%output%\InsightStorageMsSql.out"
%cli% %cli_opts% -i "%source%\tracker\trackerMsSql.sql" -o "%output%\trackerMsSql.out"
%cli% %cli_opts% -i "%source%\vault\vaultMsSql.sql" -o "%output%\vaultMsSql.out"
%cli% %cli_opts% -i "%source%\zlhub\ZLHubMsSql.sql" -o "%output%\zlHubMsSql.out"
%cli% %cli_opts% -i "%source%\zlplus\zlplusMsSql.sql" -o "%output%\zlplusMsSql.out"
%cli% %cli_opts% -i "%source%\zlplus\archive\ArchiveMsSql.sql" -o "%output%\ArchiveMsSql.out"
%cli% %cli_opts% -i "%source%\zVite\zViteMsSql.sql" -o "%output%\zViteMsSql.out"
%cli% %cli_opts% -i "%source%\caseMgmt\caseMgmtMsSql.sql" -o "%output%\caseMgmtMsSql.out"
%cli% %cli_opts% -i "%source%\records\RecordsMsSql.sql" -o "%output%\RecordsMsSql.out"
%cli% %cli_opts% -i "%source%\logEvent\logEventMsSql.sql" -o "%output%\logEventMsSql.out"
%cli% %cli_opts% -i "%source%\ucontext\UContextMsSql.sql" -o "%output%\UContextMsSql.out"
%cli% %cli_opts% -i "%source%\zldocker\initContainerMsSql.sql" -o "%output%\initContainerMsSql.out"
echo.
echo Database Setup Completed
pause
