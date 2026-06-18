import requests
import json

payload_str = "entry.123456=Test"

req = requests.Request('POST', "http://httpbin.org/post", data=payload_str)
prepared = req.prepare()
print("Headers sent with string data:", prepared.headers)

payload_dict = {"entry.123456": "Test"}
req2 = requests.Request('POST', "http://httpbin.org/post", data=payload_dict)
prepared2 = req2.prepare()
print("Headers sent with dict data:", prepared2.headers)

