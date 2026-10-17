$csr = @"
-----BEGIN CERTIFICATE REQUEST-----
MIIDAjCCAeoCAQAwfTELMAkGA1UEBhMCS1oxEjAQBgNVBAgMCUthcmFnYW5kYTER
MA8GA1UEBwwIVGVtaXJ0YXUxITAfBgNVBAoMGE1ub2dvcHJvZmlsbmF5YSBCb2xu
aXRzYTELMAkGA1UECwwCSVQxFzAVBgNVBAMMDmJlaWRnZS5ncDEubG9jMIIBIjAN
BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5Uh0iqMAhmCJBfi6n3fpbNB/GPWV
ovgwIpNm1n5QqzZzexDq1MD0IThvlcoc7NvAbS3bU6Ver+7ssNDXrX2y889wuFaj
ILiFmXYAMWDbC8V1CrBkgUKbTjXBLxwO4jKSNdeTwclsDgP4ChbLbBT4bsfQ/bGX
Q4w+/NDH34HCW8tXnMBWy+VVuCMxHQPKxV2BLoyEBmMMbvTMEoVA/Nyk/CXBtbws
OAi9H+OtgQWr/2GQACNHo4LuM/abyZAs/af81aIB/V5J6umCCvaSJ/Fvcd86IZ34
pa+DswjuK1gY3+9mWTZOshPO5e6iIqjTGhu16UOlSep3NZcxtRNc3VH+GwIDAQAB
oEAwPgYJKoZIhvcNAQkOMTEwLzAtBgNVHREEJjAkgg5iZWlkZ2UuZ3AxLmxvY4IG
YmVpZGdlhwSsEBALhwSsEBGxMA0GCSqGSIb3DQEBCwUAA4IBAQDQwAGVKWPhSLaf
/ZeV2ARRL4R0LUWU9WAETo+4bYV16k8WcJ3FAJwidkhOpVQa30C7oRPa73pUi0jy
0AW+ghFelf8oCzRHmTnXsmk4Ojzf+LisPvCPRJrE/DZsM7YMfWjTr/NNjSIj0VfX
p8WrUJipbWe3fhaaTwa1g/Df+ZYMTNR3GVvRqTr1rZ6BuU/uPMWQ626zwzQO3dPT
5WRcLg5GfNI/QwoCQEl512RdBdpncLcVV8747qFwJFWOxBpYksPJSlL/noXjalWc
bUbNQeCjDRJP6zaRc3+JBKhySgcc1Ls3KTTKGzMfaMBYGUxRjdBLGIhodIv/7nmU
s80YEeVQ
-----END CERTIFICATE REQUEST-----
"@

$ca = 'dc01.gp1.loc\gp1-DC01-CA'
$request = New-Object -ComObject CertificateAuthority.Request
$csrClean = $csr -replace '-----BEGIN CERTIFICATE REQUEST-----|-----END CERTIFICATE REQUEST-----|\s', ''
$disposition = $request.Submit(257, $csrClean, 'CertificateTemplate:WebServer', $ca)
Write-Host "Disposition: $disposition"
if ($disposition -eq 3) {
    $cert = $request.GetCertificate(1) # CR_OUT_BASE64HEADER
    $cert | Out-File -FilePath "C:\Users\zqrey3\Documents\Codex\beidge\scratch\beidge.crt" -Encoding ascii
    Write-Host "SUCCESS: Certificate issued! Request ID: $($request.GetRequestId())"
} else {
    Write-Host "Error message: $($request.GetDispositionMessage())"
}
