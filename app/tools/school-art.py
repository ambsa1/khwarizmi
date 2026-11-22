"""Original drawings for the «المدرسة» section, in the Khwarizmi identity style (identity/02-art-styles.md, «ج»):
flat colour shapes from the colour network (identity/03-color-network.md), selective ink lines only where the detail
matters, one soft highlight, a soft ground shadow and the same paper grain on every drawing. No faces, no text.
Usage: python tools/school-art.py [names...]   ->  public/art/school/<name>.svg  (+ a contact sheet for review)"""
import os, sys

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'art', 'school')
INK = '#2B2118'
C = dict(sand50='#F9F6F2', sand100='#F1EBE3', sand200='#E6DACA', sand300='#D9C4A6', sand='#C9A676', sand700='#956E39',
         gold300='#F8D288', gold='#FFB627', gold700='#BA7C03', saff300='#ECBF93', saff='#E8892B', saff700='#A25810',
         clay300='#E5AE9A', clay='#D9643A', clay700='#963C1C', taka300='#D8B2A6', taka='#C98B7A',
         rose200='#EDC5D5', rose300='#E49CBB', rose='#D9558F', rose700='#A02358', royal300='#B2A5DA', royal='#7B61C9', royal700='#49318E',
         night='#2C3760', night700='#20253F', nile300='#9CBDE2', nile='#1F5FAD', nile700='#163E70', sky200='#C7E1E9', sky300='#9ED1E1', sky='#5CB8D6',
         sea300='#9DE2E1', sea='#1FA3A3', sea700='#166A69', palm300='#AAD6B1', palm='#3E9B4F', palm700='#2A6532', olive300='#C5D6A8', olive='#9DBF6A', olive700='#698638',
         earth300='#D5BCAA', earth='#8A5A3B', earth700='#5B3B26', white='#FFFBF3')

def svg(body, vb='0 0 128 128', shadow=None):
    """wrap a drawing: optional ground shadow, the art, its grain (clipped to the painted areas)"""
    sh = f'<ellipse cx="{shadow[0]}" cy="{shadow[1]}" rx="{shadow[2]}" ry="{shadow[3]}" fill="{INK}" opacity=".10"/>' if shadow else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="{vb}">'
            '<defs><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" stitchTiles="stitch"/>'
            '<feColorMatrix values="0 0 0 0 .17  0 0 0 0 .13  0 0 0 0 .09  0 0 0 .16 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>'
            f'{sh}<g id="art" stroke-linecap="round" stroke-linejoin="round">{body}</g><use xlink:href="#art" filter="url(#grain)"/></svg>')

def ink(d, w=2.2, o=1): return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w}" opacity="{o}"/>'
def hi(d, o=.32): return f'<path d="{d}" fill="{C["white"]}" opacity="{o}"/>'
def P(d, fill, extra=''): return f'<path d="{d}" fill="{fill}" {extra}/>'

ART = {}

# ---------------------------------------------------------------- lesson icons (book page path)
ART['icon-lungs'] = svg(  # d1: two lungs, windpipe and bronchi (right lung has three lobes, left two: notch on each side)
    P('M60 12h8v34h-8z', C['sky200']) + ink('M60 18h8M60 25h8M60 32h8M60 39h8', 1.4, .55) +
    P('M57 48C42 40 21 54 18 82c-2 20 9 32 24 30 10-1 16-9 16-21V60z', C['rose300']) +
    P('M71 48c15-8 36 6 39 34 2 20-9 32-24 30-10-1-16-9-16-21V60z', C['rose300']) +
    P('M30 64c-6 8-8 20-6 30 5-12 12-20 22-24-6-2-11-4-16-6z', C['rose'], 'opacity=".45"') +
    P('M98 64c6 8 8 20 6 30-5-12-12-20-22-24 6-2 11-4 16-6z', C['rose'], 'opacity=".45"') +
    hi('M30 58c4-6 12-9 20-8-8 3-14 8-17 15z', .45) + hi('M80 52c6-1 13 1 18 7-7-2-13-2-18 0z', .45) +
    ink('M64 46v6M64 52c-4 4-8 6-12 12M64 52c4 4 8 6 12 12M52 64c-3 6-8 10-12 12M52 64v12M76 64c3 6 8 10 12 12M76 64v12', 2) +
    ink('M37 74c4 3 9 5 14 5M92 82c-4 2-8 3-13 2', 1.3, .5), shadow=(64, 118, 36, 4))

ART['icon-digestion'] = svg(  # d2: the food's journey: oesophagus -> stomach (J shape) -> small intestine framed by the large intestine
    f'<path d="M50 6v22c0 6 2 9 6 11" fill="none" stroke="{C["clay300"]}" stroke-width="9"/>' +
    P('M54 34c2 8 8 10 16 9 14-2 26 4 26 16 0 13-12 21-26 20-9-1-14-6-20-5-4 1-6-3-3-6 5-4 11-2 17-2 9 0 15-3 15-8s-6-7-12-6c-11 2-17-6-17-16z', C['rose300']) +
    P('M60 62c8 1 16-1 20-6 0 7-7 11-17 11z', C['rose'], 'opacity=".45"') + hi('M74 47c8-1 15 2 17 8-5-4-11-5-17-4z', .5) +
    f'<path d="M34 118V92c0-7 4-10 10-10h40c6 0 10 3 10 10v26" fill="none" stroke="{C["saff300"]}" stroke-width="9"/>' +
    f'<path d="M46 110c0-6 6-6 6-12s6-6 9 0 9 6 9 0-6-6-3-10" fill="none" stroke="{C["clay300"]}" stroke-width="7"/>' +
    ink('M34 118V92c0-7 4-10 10-10h40c6 0 10 3 10 10v26', 1.3, .45) + ink('M70 50c6 0 10 2 12 6', 1.4, .5) +
    P('M22 10c0-6 5-10 11-9 5 1 8 5 7 10-1 6-6 9-11 8-4-1-7-4-7-9z', C['gold']) + ink('M27 11h.1M32 8h.1M34 14h.1', 2.6, .7) +
    ink('M40 14c3 0 6 1 8 3', 1.6, .55), shadow=(64, 122, 34, 3))

ART['icon-explain'] = svg(  # listened explainer: headphones over an open book
    P('M24 74c0-30 18-50 40-50s40 20 40 50h-10c0-24-13-40-30-40S34 50 34 74z', C['night']) +
    P('M16 72c0-5 4-8 9-8h7v34h-7c-5 0-9-3-9-8z', C['saff']) + P('M112 72c0-5-4-8-9-8h-7v34h7c5 0 9-3 9-8z', C['saff']) +
    P('M38 66c8-4 18-4 26 2 8-6 18-6 26-2v40c-8-4-18-4-26 2-8-6-18-6-26-2z', C['white']) +
    P('M64 68v40', 'none', f'stroke="{INK}" stroke-width="1.6" opacity=".5"') +
    ink('M44 78c5-1 10 0 14 2M44 86c5-1 10 0 14 2M70 80c4-2 9-3 14-2M70 88c4-2 9-3 14-2', 1.4, .45) +
    hi('M20 70c1-2 3-3 5-3v26c-3 0-5-2-5-4z', .4) + hi('M40 30c7-5 15-7 24-7-10 2-18 6-24 12z', .25), shadow=(64, 116, 40, 4))

ART['icon-exam'] = svg(  # exam: a paper with ticks and a pencil
    P('M30 16h52l16 16v78a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z', C['white']) + P('M82 16v16h16z', C['sand200']) +
    ink('M38 44l5 5 9-10M38 66l5 5 9-10M38 88l5 5 9-10', 2.4) + ink('M60 46h26M60 68h26M60 90h18', 1.6, .4) +
    P('M88 112l6-20 26-38 10 7-26 38z', C['gold']) + P('M88 112l6-20 10 7z', C['sand300']) + P('M116 50l4-6 10 7-4 6z', C['clay']) +
    ink('M88 112l3-9', 1.4) + P('M26 20a4 4 0 0 1 4-4h4v98h-4a4 4 0 0 1-4-4z', C['nile'], 'opacity=".18"'), shadow=(64, 118, 38, 4))

ART['icon-title'] = svg(  # the book's title: a cup with a star
    P('M40 20h48v22c0 18-10 30-24 30S40 60 40 42z', C['gold']) +
    P('M40 26H28c0 14 6 22 16 24l-2-8c-5-2-8-7-8-12h6zM88 26h12c0 14-6 22-16 24l2-8c5-2 8-7 8-12h-6z', C['gold700']) +
    P('M58 72h12v14H58z', C['gold700']) + P('M44 88h40l4 14H40z', C['earth']) + P('M38 102h52v8H38z', C['earth700']) +
    P('M64 30l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z', C['white']) + hi('M46 24c0 10 2 20 8 26-8-4-10-14-10-26z', .4), shadow=(64, 116, 32, 4))

def leaf(cx, cy, rx, ry, rot, fill, vein=True):
    s = f'<g transform="translate({cx} {cy}) rotate({rot})"><path d="M{-rx} 0C{-rx/2} {-ry} {rx/2} {-ry} {rx} 0C{rx/2} {ry} {-rx/2} {ry} {-rx} 0z" fill="{fill}"/>'
    if vein: s += ink(f'M{-rx*.8} 0H{rx*.8}', 1.2, .45)
    return s + '</g>'

ART['icon-plant'] = svg(   # d3: a plant whose leaves show their veins (the vessels that carry water)
    P('M30 110c8-8 20-12 34-12s26 4 34 12z', C['earth']) + f'<path d="M64 104V40" stroke="{C["palm700"]}" stroke-width="5" fill="none"/>' +
    leaf(44, 52, 20, 11, -25, C['palm']) + leaf(84, 50, 20, 11, 25, C['palm']) + leaf(46, 78, 18, 10, -10, C['olive']) + leaf(82, 76, 18, 10, 10, C['olive']) +
    leaf(64, 30, 14, 9, -90, C['palm']) + ink('M64 102V44', 1.2, .4) + ink('M50 51l-8-6M78 49l8-6', 1, .35), shadow=(64, 112, 34, 3))
ART['icon-flower'] = svg(  # d4: a flowering plant
    f'<path d="M64 112V60" stroke="{C["palm700"]}" stroke-width="5" fill="none"/>' + leaf(50, 92, 16, 8, -30, C['palm']) + leaf(78, 84, 16, 8, 30, C['olive']) +
    ''.join(f'<ellipse cx="64" cy="30" rx="11" ry="20" fill="{C["rose"] if i % 2 else C["rose300"]}" transform="rotate({i * 72} 64 46)"/>' for i in range(5)) +
    '<circle cx="64" cy="46" r="10" fill="#FFB627"/>' + ink('M60 44h.1M66 42h.1M65 49h.1', 2.4, .6), shadow=(64, 114, 26, 3))
ART['icon-seedling'] = svg(  # d5: a seedling with its two cotyledons out of the seed
    P('M26 108c10-8 24-11 38-11s28 3 38 11z', C['earth']) +
    P('M50 98c-4-6 0-14 8-14 4 0 6 4 6 8-6 0-10 2-14 6zM78 98c4-6 0-14-8-14-4 0-6 4-6 8 6 0 10 2 14 6z', C['saff300']) +
    f'<path d="M64 98V54" stroke="{C["palm700"]}" stroke-width="5" fill="none"/>' +
    P('M64 56c-4-14-18-20-32-16 2 14 16 22 32 16z', C['palm']) + P('M64 56c4-14 18-20 32-16-2 14-16 22-32 16z', C['olive']) +
    ink('M62 54c-8-4-16-8-24-10M66 54c8-4 16-8 24-10', 1.2, .45), shadow=(64, 112, 34, 3))
ART['icon-backbone'] = svg(  # d6: vertebrates: a fish skeleton showing the backbone
    P('M16 64c14-16 34-22 56-22v44c-22 0-42-6-56-22z', C['sky200']) + P('M96 64l20-16v32z', C['sky']) +
    f'<path d="M24 64H100" stroke="{C["white"]}" stroke-width="7"/>' + ink('M24 64H100', 2) +
    ''.join(ink(f'M{x} 64c-3-8-3-14 0-20M{x} 64c-3 8-3 14 0 20', 1.8) for x in range(40, 92, 10)) +
    '<circle cx="28" cy="58" r="3.5" fill="#2B2118"/>', shadow=(64, 108, 40, 3))
ART['icon-snail'] = svg(   # d7: invertebrates: a snail
    P('M18 96c0-6 6-8 14-8h58c8 0 14 2 18 8v6H18z', C['taka300']) + P('M18 96c-4-10 0-24 8-24s8 12 6 20z', C['taka300']) +
    ink('M24 74l-4-14M28 72l2-14', 1.8) + '<circle cx="20" cy="59" r="2.5" fill="#2B2118"/><circle cx="30" cy="57" r="2.5" fill="#2B2118"/>' +
    '<circle cx="70" cy="66" r="30" fill="#E8892B"/>' + ink('M70 66m-6 0a6 6 0 1 1 12 0 13 13 0 1 1-26 0 20 20 0 1 1 40 0 27 27 0 0 1-27 27', 2) +
    hi('M50 50c6-8 16-12 26-10-10 2-18 6-24 14z', .4), shadow=(64, 106, 46, 4))
ART['icon-tap'] = svg(     # d8: water and its uses: a tap with running water
    P('M20 30h40v16H20z', C['sand300']) + P('M56 26h22c10 0 16 6 16 16v14H78V44c0-2-1-3-3-3H56z', C['sky200']) + P('M30 18h16v12H30z', C['nile']) +
    P('M78 56h16v8H78z', C['sand300']) + f'<path d="M86 66v26" stroke="{C["sky"]}" stroke-width="7" stroke-dasharray="1 0"/>' +
    P('M86 92c-7 9-10 14-10 19a10 10 0 0 0 20 0c0-5-3-10-10-19z', C['sky']) + hi('M82 106c0-3 1-5 3-7-1 3-1 5 0 8z', .6) +
    ink('M58 30h18c8 0 13 5 13 13', 1.3, .4), shadow=(86, 122, 16, 2))
ART['icon-drop'] = svg(    # d9: properties of water: a water drop
    P('M64 14C46 40 34 58 34 76a30 30 0 0 0 60 0c0-18-12-36-30-62z', C['sky']) + P('M64 14C82 40 94 58 94 76a30 30 0 0 1-30 30c16-8 22-22 20-38-2-14-10-28-20-54z', C['nile'], 'opacity=".35"') +
    hi('M48 70c0-10 6-20 12-28-4 10-6 20-4 32z', .6) + hi('M48 84a6 6 0 1 0 0 .1z', .6), shadow=(64, 114, 26, 3))
ART['icon-rain'] = svg(    # d10: states of water and its cycle: a cloud with rain
    P('M28 70c-10 0-16-8-14-17 2-8 10-12 18-10 2-14 14-24 28-22 10 1 18 8 21 17 12-2 24 6 24 18 0 9-8 14-16 14z', C['sky200']) +
    hi('M30 50c4-8 12-12 20-10-8 2-14 6-18 12z', .7) +
    ''.join(P(f'M{x} {y}c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z', C['sky']) for x, y in ((40, 82), (64, 90), (88, 82))) +
    ink('M30 70h58', 1.2, .3), shadow=(64, 116, 30, 3))
ART['icon-polluted'] = svg(  # d11: water pollution: a glass of murky water
    P('M34 26h60l-8 84a6 6 0 0 1-6 6H48a6 6 0 0 1-6-6z', C['white'], 'opacity=".9"') + P('M38 52h52l-5 58a6 6 0 0 1-6 6H49a6 6 0 0 1-6-6z', C['olive700'], 'opacity=".55"') +
    ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{C["earth700"]}" opacity=".7"/>' for x, y, r in ((52, 70, 3), (70, 84, 4), (60, 98, 2.5), (78, 64, 2.5), (66, 106, 3))) +
    ink('M34 26h60l-8 84a6 6 0 0 1-6 6H48a6 6 0 0 1-6-6z', 1.6, .5) + hi('M40 32h6l6 76h-4z', .5), shadow=(64, 120, 22, 3))
ART['icon-motion'] = svg(  # d12: motion: a rolling ball with motion lines
    '<circle cx="76" cy="70" r="30" fill="#D9643A"/>' + P('M76 40a30 30 0 0 1 0 60c-12-8-18-18-18-30s6-22 18-30z', C['gold']) +
    hi('M58 56c4-8 12-12 20-12-8 3-14 8-18 16z', .45) + ink('M14 56h22M8 70h26M14 84h22', 3, .55) + P('M30 104h80v4H30z', C['earth'], 'opacity=".5"'),
    shadow=(76, 104, 26, 3))
ART['icon-gravity'] = svg(  # d13: forces: a mango falling from a branch toward the ground (gravity)
    f'<path d="M14 20c20 4 40 2 60-6" stroke="{C["earth"]}" stroke-width="6" fill="none"/>' + leaf(40, 26, 12, 6, 20, C['palm']) + leaf(66, 22, 12, 6, -20, C['olive']) +
    P('M66 60c10-4 22 2 22 16 0 12-10 20-20 20-12 0-18-8-18-18 0-10 6-16 16-18z', C['gold']) + P('M74 62c8 2 14 8 14 16-2-8-8-12-14-12z', C['saff'], 'opacity=".6"') +
    ink('M66 30v20', 2, .5) + ink('M66 34v4M66 42v4', 2.4) + P('M20 112h88v6H20z', C['earth'], 'opacity=".55"') + ink('M48 104l6-4M88 104l-6-4', 1.6, .4),
    shadow=(68, 112, 18, 2))
ART['icon-static'] = svg(  # d14: static electricity: a balloon with small charge marks
    P('M64 14c20 0 32 16 32 34 0 22-16 38-32 38S32 70 32 48c0-18 12-34 32-34z', C['rose']) + P('M60 86h8l-4 6z', C['rose700']) +
    ink('M64 92c-4 8 4 12 0 20s4 10 0 14', 1.6, .6) + hi('M44 36c2-10 10-16 18-16-8 4-14 10-16 18z', .45) +
    ink('M102 36h10M107 31v10M16 56h10M21 51v10M100 70h10M105 65v10', 2.4), shadow=(64, 124, 16, 2))
ART['icon-lightning'] = svg(  # d15: electric discharge and lightning: a storm cloud with a bolt
    P('M26 62c-10 0-16-8-14-16 2-8 10-12 18-10 2-14 14-24 28-22 10 1 18 8 21 17 12-2 24 6 24 18 0 8-8 13-16 13z', C['night']) +
    hi('M30 42c4-8 12-12 20-10-8 2-14 6-18 12z', .25) + P('M66 60L48 92h14l-8 28 28-38H68l10-22z', C['gold']) + ink('M66 60L48 92h14l-8 28', 1.4, .4),
    shadow=(64, 122, 18, 2))
ART['icon-circuit'] = svg(  # d16: electric circuits: a lit bulb in a closed loop with a battery
    f'<path d="M64 74V100H22V40h28M78 74V100h28V40H90" stroke="{C["earth"]}" stroke-width="4" fill="none"/>' +
    P('M52 54c0-10 6-18 13-18s13 8 13 18c0 6-4 10-6 14H58c-2-4-6-8-6-14z', C['gold']) + P('M58 68h14v8H58z', C['sand300']) +
    hi('M57 52c0-6 3-10 7-12-3 4-4 8-4 12z', .6) + ink('M60 62l3-6 3 6 3-6', 1.4, .6) + ink('M44 30l-4-6M86 30l4-6M65 26v-8', 2, .7) +
    P('M30 92h24v16H30z', C['nile']) + P('M54 96h4v8h-4z', C['sand300']), shadow=(64, 114, 40, 3))
ART['icon-magnet'] = svg(  # d17: magnets: a horseshoe magnet attracting two pins
    f'<path d="M36 24v40a28 28 0 0 0 56 0V24" stroke="{C["clay"]}" stroke-width="20" fill="none"/>' +
    P('M26 18h20v16H26zM82 18h20v16H82z', C['sand200']) + hi('M30 40h4v24c0 6 2 12 6 16-6-3-10-10-10-16z', .35) +
    ink('M22 10l-4-6M36 8V2M92 8V2M106 10l4-6', 2, .6), shadow=(64, 106, 30, 3))
ART['icon-compass'] = svg(  # d18: magnet properties: a compass
    '<circle cx="64" cy="64" r="44" fill="#8A5A3B"/><circle cx="64" cy="64" r="36" fill="#FFFBF3"/>' +
    P('M64 30l9 34H55z', C['clay']) + P('M64 98l9-34H55z', C['sand300']) + '<circle cx="64" cy="64" r="5" fill="#2B2118"/>' +
    ink('M64 32v6M64 90v6M32 64h6M90 64h6', 1.8, .5) + hi('M36 50c4-10 12-16 22-18-8 4-14 10-18 20z', .45), shadow=(64, 114, 36, 3))

# ---------------------------------------------------------------- scene drawings (explainer 1)
ART['tree'] = svg(   # a neem tree: dense rounded crown of small leaves on a short trunk
    P('M70 200c2-30 0-56-6-80h20c-4 24-4 50 0 80z', C['earth']) + ink('M76 150l14-14M74 170l-12-10', 3, .5) +
    ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{f}"/>' for x, y, r, f in
            ((80, 70, 44, C['palm700']), (44, 92, 34, C['palm']), (116, 92, 34, C['palm']), (60, 52, 32, C['palm']), (104, 50, 30, C['palm']),
             (80, 104, 34, C['palm']), (80, 40, 26, C['olive']), (52, 78, 18, C['olive']), (110, 74, 16, C['olive']))) +
    hi('M50 40c10-16 30-22 46-16-18 0-32 6-42 22z', .35) +
    ''.join(ink(f'M{x} {y}c3-3 6-3 8 0', 1.3, .35) for x, y in ((60, 70), (96, 60), (78, 90), (110, 100), (48, 100), (88, 120), (66, 112), (100, 84))),
    vb='0 0 160 210', shadow=(80, 202, 46, 6))
ART['bird'] = svg(   # a sparrow (عصفور) in profile, no face detail but the eye dot
    P('M30 70c0-22 18-36 40-34 14 1 26 10 30 22l18 4-16 8c-4 18-20 30-40 30-18 0-32-12-32-30z', C['saff300']) +
    P('M100 58l18 4-16 8z', C['gold700']) + P('M36 66c10 6 26 8 40 2-6 14-20 20-32 16-6-3-8-10-8-18z', C['sand50']) +
    P('M44 52c16-4 34 2 42 14-14-2-30 0-44 8-4-8-3-16 2-22z', C['earth']) + ink('M54 58c8 0 16 3 22 8M50 64c8 0 14 2 20 6', 1.4, .45) +
    P('M30 72l-22 6 20 8z', C['earth700']) + '<circle cx="90" cy="54" r="3" fill="#2B2118"/>' + ink('M60 98v12M72 98v12M56 110h8M68 110h8', 2.2),
    vb='0 0 130 120', shadow=(66, 112, 22, 3))
ART['fish'] = svg(   # a Nile fish (بلطي-like), side view
    P('M14 50c16-24 48-32 76-20 10 4 18 12 22 20-4 8-12 16-22 20-28 12-60 4-76-20z', C['sea']) +
    P('M108 50l22-18v36z', C['sea700']) + P('M44 28c10-8 26-10 38-4l-6 10c-10-4-22-4-32-6z', C['sea700']) +
    P('M30 56c18 10 44 12 66 4-18 14-46 14-66-4z', C['sea300']) + hi('M30 40c12-8 28-12 44-10-16 2-30 6-42 14z', .4) +
    ''.join(ink(f'M{x} 40c4 6 4 14 0 20', 1.2, .35) for x in (52, 62, 72, 82)) + '<circle cx="30" cy="46" r="3.5" fill="#2B2118"/>' + ink('M38 38c4 6 4 18 0 24', 1.6, .5),
    vb='0 0 132 100')
ART['kids'] = svg(   # two children as silhouettes (no faces): a boy and a girl in a headscarf, side by side
    P('M44 70c-14 0-22 10-22 26v70h44V96c0-16-8-26-22-26z', C['nile']) + '<circle cx="44" cy="46" r="20" fill="#5B3B26"/>' +
    P('M30 166h12v28H30zM46 166h12v28H46z', C['nile700']) +
    P('M104 66c-16 0-26 12-26 30v72h52V96c0-18-10-30-26-30z', C['rose']) + P('M104 22c-14 0-24 10-24 24 0 10 4 18 10 22h28c6-4 10-12 10-22 0-14-10-24-24-24z', C['saff300']) +
    P('M90 168h12v26H90zM106 168h12v26h-12z', C['rose700']) + hi('M28 92c2-8 6-14 12-16-4 6-6 12-6 20z', .3) + hi('M84 90c2-8 8-14 14-16-6 6-8 12-8 20z', .3),
    vb='0 0 150 200', shadow=(76, 196, 56, 5))
ART['plate'] = svg(  # a plate of healthy food: bread, tomato, cucumber, greens, beans
    '<ellipse cx="80" cy="70" rx="72" ry="42" fill="#FFFBF3"/><ellipse cx="80" cy="66" rx="56" ry="30" fill="#E6DACA"/>' +
    P('M38 62c4-12 22-16 34-8 4 3 2 10-4 12-10 4-22 6-30-4z', C['saff300']) + ink('M46 58c6 2 12 2 18 0', 1.4, .5) +
    '<circle cx="96" cy="56" r="11" fill="#D9643A"/><circle cx="114" cy="68" r="9" fill="#D9643A"/>' + hi('M90 52a4 4 0 1 0 0 .1z', .6) +
    leaf(80, 78, 16, 7, 10, C['palm']) + leaf(62, 80, 12, 6, -20, C['olive']) +
    ''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="{C["olive"]}"/><circle cx="{x}" cy="{y}" r="4" fill="{C["olive300"]}"/>' for x, y in ((100, 82), (114, 50))) +
    ink('M14 70c4 18 32 32 66 32s62-14 66-32', 1.4, .35), vb='0 0 160 120', shadow=(80, 112, 60, 5))
ART['ibreeq'] = svg(  # a Sudanese ibreeq (water jug with a long spout)
    P('M50 40h44l6 18c8 20 6 46-6 62H50c-12-16-14-42-6-62z', C['nile']) + P('M54 30h36v12H54z', C['nile700']) +
    f'<path d="M96 70c18-2 30-16 36-34" stroke="{C["nile"]}" stroke-width="9" fill="none"/>' +
    f'<path d="M48 54c-18 2-24 34-2 40" stroke="{C["nile700"]}" stroke-width="6" fill="none"/>' +
    hi('M58 52c-6 18-6 40 2 58-10-14-12-38-6-58z', .4) + ink('M50 64h48', 1.4, .35), vb='0 0 140 130', shadow=(72, 122, 32, 4))
ART['tap'] = ART['icon-tap']
ART['wind'] = svg(   # breathing: soft swirls of air
    ink('M10 44h70c14 0 20-18 6-22-8-2-14 6-10 12', 6, .9).replace(INK, C['sky']) +
    ink('M10 66h96c14 0 20 18 6 22-8 2-14-6-10-12', 6, .9).replace(INK, C['sky300']) + ink('M24 88h40', 6, .9).replace(INK, C['sky']), vb='0 0 130 110')
ART['grow'] = svg(   # growing: a seedling with a rising arrow
    P('M20 112c10-8 22-10 34-10s24 2 34 10z', C['earth']) + f'<path d="M54 104V64" stroke="{C["palm700"]}" stroke-width="5" fill="none"/>' +
    leaf(42, 70, 14, 7, -30, C['palm']) + leaf(66, 62, 14, 7, 30, C['olive']) +
    f'<path d="M96 100V26" stroke="{C["gold"]}" stroke-width="9" fill="none"/>' + P('M80 34l16-20 16 20z', C['gold']), vb='0 0 120 120')
ART['morsel'] = svg(  # a morsel of bread (the piece that travels)
    P('M14 40c0-16 14-26 30-24 14 2 22 12 20 26-2 14-14 22-28 20-14-1-22-10-22-22z', C['saff300']) +
    P('M22 30c6-8 18-10 28-6-10 0-18 4-24 12z', C['white'], 'opacity=".5"') + ink('M28 40h.1M40 34h.1M44 48h.1M32 52h.1', 3, .5), vb='0 0 80 80')
ART['bee'] = svg(    # an insect: a bee
    '<ellipse cx="60" cy="60" rx="30" ry="22" fill="#FFB627"/>' + ink('M50 40c-4 12-4 28 0 40M64 38c-4 14-4 30 0 44', 7).replace(INK, C['earth700']) +
    '<circle cx="96" cy="58" r="13" fill="#5B3B26"/><circle cx="100" cy="54" r="3" fill="#FFFBF3"/>' + P('M28 58l-12 4 12 4z', C['earth700']) +
    '<ellipse cx="50" cy="30" rx="16" ry="11" fill="#C7E1E9" opacity=".9" transform="rotate(-20 50 30)"/><ellipse cx="70" cy="28" rx="14" ry="10" fill="#E2EFF2" opacity=".9" transform="rotate(20 70 28)"/>' +
    ink('M100 46l4-12M106 48l8-8', 1.8), vb='0 0 120 100')
ART['mango'] = svg(  # fruit: a Sudanese mango
    P('M30 30c20-12 54-6 62 22 6 24-10 46-34 46-20 0-34-14-36-32-1-14 2-28 8-36z', C['gold']) + P('M84 48c6 20-6 40-26 44 18-8 26-26 26-44z', C['saff'], 'opacity=".7"') +
    P('M30 50c4-12 14-18 24-18-10 4-18 10-22 20z', C['white'], 'opacity=".45"') + leaf(64, 20, 14, 6, -20, C['palm']) + ink('M54 26c2-4 4-8 8-10', 2), vb='0 0 110 110')
ART['banana'] = svg(
    P('M18 34c8 36 40 56 76 44 6-2 6-8 0-8-30 6-54-10-66-40-2-6-12-4-10 4z', C['gold']) + P('M24 40c14 24 36 36 64 34-28 8-52-6-64-34z', C['gold700'], 'opacity=".45"') +
    P('M16 30l-4-8 8-2 4 8z', C['earth700']), vb='0 0 110 100')
ART['orange'] = svg(
    '<circle cx="56" cy="60" r="36" fill="#E8892B"/>' + P('M56 24a36 36 0 0 1 0 72c18-10 24-24 24-36s-6-26-24-36z', C['saff700'], 'opacity=".35"') +
    hi('M34 46c4-10 12-16 22-18-8 4-14 10-18 20z', .5) + leaf(66, 22, 12, 6, -25, C['palm']) +
    ''.join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="#A25810" opacity=".5"/>' for x, y in ((44, 66), (60, 76), (70, 56), (50, 52), (66, 86))), vb='0 0 110 110')
ART['guava'] = svg(
    P('M56 24c22 0 36 18 36 38s-16 36-36 36-36-16-36-36 14-38 36-38z', C['olive']) + P('M64 26c16 6 28 20 28 36s-10 30-26 34c12-10 16-22 16-34s-6-26-18-36z', C['olive700'], 'opacity=".35"') +
    hi('M34 50c4-10 12-18 22-20-8 4-14 12-18 22z', .45) + P('M52 18h8l-2 10h-4z', C['earth']), vb='0 0 110 110')
ART['tomato'] = svg(
    P('M56 30c24 0 38 14 38 32 0 20-16 34-38 34S18 82 18 62c0-18 14-32 38-32z', C['clay']) + hi('M30 52c4-10 14-16 24-16-10 4-18 10-22 20z', .45) +
    P('M56 22l6 10 12-2-8 8 8 6-12-2-6 8-6-8-12 2 8-6-8-8 12 2z', C['palm']), vb='0 0 110 110')
ART['carrot'] = svg(
    P('M76 26c8 6 10 16 4 24L34 98c-4 4-10 0-8-6l26-56c4-10 16-14 24-10z', C['saff']) + ink('M48 60l8 4M40 76l8 4M58 44l6 4', 1.6, .45) +
    leaf(84, 18, 12, 5, -50, C['palm']) + leaf(94, 26, 12, 5, -20, C['olive']) + leaf(80, 10, 10, 4, -80, C['palm']), vb='0 0 110 110')
ART['eggplant'] = svg(
    P('M70 30c16 8 18 30 6 46-12 16-34 24-48 14-12-8-8-24 6-32 12-6 20-12 24-24 2-6 8-8 12-4z', C['royal700']) +
    P('M64 44c6 8 4 20-6 28 2-10 4-20 6-28z', C['royal'], 'opacity=".6"') + hi('M40 72c6-6 14-10 20-12-6 4-12 8-16 14z', .35) +
    P('M64 24c6-6 16-6 20 2l-6 8c-4-4-10-6-14-4z', C['palm']) + P('M78 18l6-8 4 2-6 8z', C['palm700']), vb='0 0 110 110')
ART['okra'] = svg(   # بامية / ويكة
    P('M36 24c10-4 18 0 22 8l26 58c2 6-4 10-8 6L32 46c-6-8-4-18 4-22z', C['palm']) + ink('M44 30l30 62M38 38l34 54', 1.4, .45) +
    P('M30 20c4-6 12-8 16-4l-4 8c-4-2-8-2-12-4z', C['palm700']), vb='0 0 110 110')
ART['basket'] = svg(  # a Sudanese woven palm-leaf basket (قفة) with a geometric band
    P('M16 40h128l-14 68c-2 8-8 12-16 12H46c-8 0-14-4-16-12z', C['sand']) + P('M12 32h136v14H12z', C['sand700']) +
    P('M24 62h112l-3 16H27z', C['clay']) + ''.join(P(f'M{x} 62l8 8-8 8-8-8z', C['gold']) for x in range(36, 132, 16)) +
    P('M30 92h100l-2 10H32z', C['earth']) + ''.join(ink(f'M{x} 46l-4 68', 1.2, .25) for x in range(36, 132, 12)) + ink('M20 50h120M24 86h112', 1.2, .35),
    vb='0 0 160 130', shadow=(80, 122, 56, 5))
ART['bat'] = svg(    # a bat silhouette
    P('M80 46c-6 0-10 4-12 10-10-12-30-18-56-12 10 6 14 14 14 24 8-6 18-6 24 0 4-6 12-8 18-4 4 6 8 10 12 10s8-4 12-10c6-4 14-2 18 4 6-6 16-6 24 0 0-10 4-18 14-24-26-6-46 0-56 12-2-6-6-10-12-10z', C['night700']) +
    P('M74 44l2-10 4 8 4-8 2 10z', C['night700']), vb='0 0 160 90')
ART['moon'] = svg(
    '<circle cx="80" cy="80" r="60" fill="#F8D288"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#ECBF93" opacity=".55"/>' for x, y, r in ((60, 64, 12), (100, 96, 9), (92, 56, 6), (66, 104, 5))) +
    hi('M40 60c8-20 26-34 48-36-20 6-36 18-44 38z', .4), vb='0 0 160 160')
ART['question'] = svg(  # a question-mark shape (drawn, not a font glyph)
    f'<path d="M36 40c0-18 14-28 28-28s28 10 28 26c0 22-28 22-28 44v6" stroke="{C["clay"]}" stroke-width="18" fill="none"/>' +
    '<circle cx="64" cy="112" r="11" fill="#D9643A"/>' + hi('M40 34c2-10 10-16 18-18-6 4-12 10-14 18z', .45), vb='0 0 128 130')
ART['cross'] = svg(ink('M24 24L104 104M104 24L24 104', 16).replace(INK, C['clay']), vb='0 0 128 128')
ART['seed'] = svg(P('M20 50c0-18 14-30 30-30s30 12 30 30-14 26-30 26-30-8-30-26z', C['saff300']) + ink('M50 26c-8 14-8 30 0 46', 1.6, .5) + hi('M28 40c4-8 10-12 18-12-6 2-12 6-14 14z', .5), vb='0 0 100 90')

# ---------------------------------------------------------------- review sheet
def sheet(names):
    cells = ''.join(f'<figure><img src="file:///{OUT}/{n}.svg"><figcaption>{n}</figcaption></figure>' for n in names)
    open(os.path.join(os.environ.get('TEMP', OUT), 'school-art-sheet.html'), 'w', encoding='utf8').write(
        '<!doctype html><meta charset=utf8><style>body{margin:0;padding:16px;background:#F1EBE3;font:14px sans-serif;display:flex;flex-wrap:wrap;gap:14px}'
        'figure{margin:0;background:#FFFBF3;border-radius:16px;padding:10px;text-align:center}img{width:150px;height:150px;display:block}</style>' + cells)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(ART)
    for n in names: open(os.path.join(OUT, n + '.svg'), 'w', encoding='utf8').write(ART[n])
    sheet(list(ART)); print(len(names), 'drawings')
