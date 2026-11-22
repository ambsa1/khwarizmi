"""Generate the sound-effect candidates with ElevenLabs text-to-sound (POST /v1/sound-generation).
The key is read from the generator .env named in خريطة-المؤثرات.md; it is never printed, copied or written anywhere.
Candidates go to C:/Users/ambsa/sfx-work/cand/<id>/ (outside the app); finished calls are skipped on a re-run.
A log of every call (seconds asked, credits charged when the API reports them) goes to sfx-work/log.jsonl."""
import json, os, re, sys, time, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan import jobs

ENV = r'C:\Users\ambsa\Documents\grow-english-vera-oscar\generator\.env'
WORK = r'C:\Users\ambsa\sfx-work'; CAND = os.path.join(WORK, 'cand'); os.makedirs(CAND, exist_ok=True)
MODEL = os.environ.get('SFX_MODEL', 'eleven_text_to_sound_v3')

def key():
    for line in open(ENV, encoding='utf8'):
        m = re.match(r'\s*(ELEVEN\w*_API_KEY|XI_API_KEY)\s*=\s*["\']?([^"\'\s#]+)', line)
        if m: return m.group(2)
    raise SystemExit('no ElevenLabs key line in the .env')

def call(k, text, seconds, model):
    body = json.dumps({'text': text, 'duration_seconds': max(0.5, seconds), 'prompt_influence': 0.6, 'model_id': model}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': k, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=120) as r:
        cost = r.headers.get('character-cost') or r.headers.get('x-character-count')
        return r.read(), cost

def main():
    k = key(); model = MODEL; log = open(os.path.join(WORK, 'log.jsonl'), 'a', encoding='utf8')
    only = set(sys.argv[1:]); done = made = 0
    for e, v, c in jobs():
        if only and e[0] not in only: continue
        d = os.path.join(CAND, e[0]); os.makedirs(d, exist_ok=True); dst = os.path.join(d, f'v{v}_c{c}.mp3')
        if os.path.exists(dst): done += 1; continue
        for attempt in range(3):
            try:
                data, cost = call(k, e[3], e[4], model); break
            except urllib.error.HTTPError as err:
                msg = err.read().decode('utf8', 'replace')[:300]
                if err.code == 422 and model.endswith('v3'):   # model not accepted: fall back to v2 (as the rules say)
                    model = 'eleven_text_to_sound_v2'; print('model -> v2', flush=True); continue
                if err.code in (429, 500, 502, 503) and attempt < 2: time.sleep(5 * (attempt + 1)); continue
                print(f'FAIL {e[0]} v{v}c{c} HTTP {err.code}: {msg}', flush=True); data = None; break
        if not data: continue
        open(dst, 'wb').write(data); made += 1
        log.write(json.dumps({'id': e[0], 'v': v, 'c': c, 'sec': max(0.5, e[4]), 'model': model, 'cost': cost, 't': time.time()}) + '\n'); log.flush()
        print(f'ok {e[0]} v{v}c{c} {len(data) // 1024}KB cost={cost}', flush=True)
    print(f'done: {made} new, {done} already there', flush=True)

if __name__ == '__main__': main()
