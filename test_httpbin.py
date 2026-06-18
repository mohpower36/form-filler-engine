import requests

# Test a mock payload to HTTPBin
payload_str = "entry.123=Male&entry.456=Female"
url = "http://httpbin.org/post"

r = requests.post(url, data=payload_str, headers={'Content-Type': 'application/x-www-form-urlencoded'})
print("Response Status:", r.status_code)
print("Response Body:", r.text)
