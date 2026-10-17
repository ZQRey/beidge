Import-Module ActiveDirectory

$samAccountName = "svc_beidge"
$name = "Сервис генерации бейджей (LDAP)"
$upn = "svc_beidge@gp1.loc"
$ou = "OU=ServiceUsers,OU=IT,OU=MB,DC=gp1,DC=loc"
$passwordPlainText = "B3idge#Ldap2026!Sec"
$securePassword = ConvertTo-SecureString $passwordPlainText -AsPlainText -Force

# Check if user already exists
$existing = Get-ADUser -Filter {SamAccountName -eq $samAccountName} -Server dc01.gp1.loc -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "Пользователь $samAccountName уже существует: $($existing.DistinguishedName)"
    Set-ADAccountPassword -Identity $samAccountName -NewPassword $securePassword -Reset -Server dc01.gp1.loc
    Set-ADUser -Identity $samAccountName -Enabled $true -PasswordNeverExpires $true -CannotChangePassword $true -Server dc01.gp1.loc
    Write-Host "Пароль и параметры пользователя $samAccountName обновлены."
} else {
    New-ADUser -SamAccountName $samAccountName `
               -Name $name `
               -DisplayName $name `
               -UserPrincipalName $upn `
               -Path $ou `
               -AccountPassword $securePassword `
               -Enabled $true `
               -PasswordNeverExpires $true `
               -CannotChangePassword $true `
               -Description "Сервисная учетная запись для чтения данных сотрудников из LDAP (Генератор бейджей)" `
               -Server dc01.gp1.loc
    Write-Host "Пользователь $samAccountName успешно создан в $ou"
}

# Verify user creation
$user = Get-ADUser -Identity $samAccountName -Server dc01.gp1.loc -Properties DistinguishedName, Enabled, PasswordNeverExpires, CannotChangePassword, UserPrincipalName
$user | Format-List SamAccountName, Name, UserPrincipalName, DistinguishedName, Enabled, PasswordNeverExpires, CannotChangePassword
