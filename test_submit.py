import requests
import json
import urllib.parse


# Let's create a test to see what google forms returns when we submit
def submit_test():
    # Public sample form I found online or we can just use the parsing logic
    url = "https://docs.google.com/forms/d/e/1FAIpQLSfBv64251XjB1yUf7o0Hn1fK_Yy-Z55A7T4v94jQ-l-9o1P3g/viewform"
    res = requests.get(url)
    content = res.text
    start_str = "var FB_PUBLIC_LOAD_DATA_ = "
    start_idx = content.find(start_str)
    content_sub = content[start_idx + len(start_str):]
    end_idx = content_sub.find(";</script>")
    if end_idx == -1:
        end_idx = content_sub.find("</script>")
    json_data = content_sub[:end_idx].strip()
    if json_data.endswith(';'):
        json_data = json_data[:-1]

    form_data = json.loads(json_data)
    fields_data = form_data[1][1]

    payload = {}
    for field in fields_data:
        if len(field) > 4 and field[4]:
            entry_id = field[4][0][0]
            options = []
            if len(field[4][0]) > 1 and field[4][0][1]:
                options = [opt[0] for opt in field[4][0][1] if opt]
            
            if options:
                payload[f"entry.{entry_id}"] = options[0]
            else:
                payload[f"entry.{entry_id}"] = "Test"

    submit_url = url.replace('/viewform', '/formResponse')
    
    # Try string format like app.py does
    payload_str = urllib.parse.urlencode(payload)
    print("Payload str:", payload_str)
    
    r = requests.post(submit_url, data=payload_str, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    print("Status:", r.status_code)
    if "Your response has been recorded." in r.text or "has been recorded" in r.text:
        print("Success! Response recorded text found.")
    else:
        print("Error? Could not find success message.")
        # Find the error message in the HTML
        if "freebirdFormviewerViewResponseLinksContainer" not in r.text:
             print("It might have been rejected.")

submit_test()
