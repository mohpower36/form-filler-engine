import os
import json
import requests
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_form():
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"error": "URL is required"}), 400

    if '/formResponse' in url:
        url = url.replace('/formResponse', '/viewform')

    try:
        res = requests.get(url, timeout=10)
        content = res.text
        start_str = "var FB_PUBLIC_LOAD_DATA_ = "
        start_idx = content.find(start_str)
        
        if start_idx == -1:
            return jsonify({"error": "Could not find form data. Ensure link is public and correct."}), 400
            
        content_sub = content[start_idx + len(start_str):]
        end_idx = content_sub.find(";</script>")
        if end_idx == -1:
            # Maybe it just ends with </script>
            end_idx = content_sub.find("</script>")
            if end_idx == -1:
                return jsonify({"error": "Could not parse form data."}), 400
            
        json_data = content_sub[:end_idx].strip()
        if json_data.endswith(';'):
            json_data = json_data[:-1]
            
        form_data = json.loads(json_data)
        
        form_title = form_data[3]
        fields_data = form_data[1][1]
        
        extracted_fields = []
        if fields_data:
            for field in fields_data:
                field_name = field[1]
                field_type = field[3]
                options = []
                entry_id = None
                if len(field) > 4 and field[4]:
                    for entry_data in field[4]:
                        entry_id = entry_data[0]
                        if len(entry_data) > 1 and entry_data[1]:
                            options = [opt[0] for opt in entry_data[1] if opt]
                
                if entry_id:
                    extracted_fields.append({
                        "name": field_name,
                        "type": field_type,
                        "id": f"entry.{entry_id}",
                        "options": options
                    })
                
        return jsonify({"title": form_title, "fields": extracted_fields})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/submit_single', methods=['POST'])
def submit_single():
    data = request.json
    url = data.get('url')
    payload = data.get('payload')
    
    if '/viewform' in url:
        url = url.replace('/viewform', '/formResponse')
        
    try:
        r = requests.post(url, data=payload, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        if r.status_code == 200:
            return jsonify({"status": "success"})
        else:
            return jsonify({"status": "error", "message": f"Status code {r.status_code}"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
