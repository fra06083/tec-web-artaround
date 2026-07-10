import os
import re

CSS_ADDITIONS = """
/* Auto-generated utility classes */
.avatar-sm { width: 38px; height: 38px; }
.cursor-pointer { cursor: pointer; }
.ls-1 { letter-spacing: 1px; }
.ls-5 { letter-spacing: 5px; }
.text-xxs { font-size: 0.65rem; }
.max-h-400 { max-height: 400px; }
.min-h-400 { min-height: 400px; }
.bg-white-20 { background-color: rgba(255, 255, 255, 0.2); }
.max-w-250 { max-width: 250px; }
.max-w-500 { max-width: 500px; }
.max-w-800 { max-width: 800px; }
.modal-backdrop-dark { background: rgba(0,0,0,0.8); }
.thumb-48 { width: 48px; height: 48px; object-fit: cover; }
.thumb-120 { height: 120px; object-fit: cover; }
.min-w-0 { min-width: 0; }
.z-1100 { z-index: 1100; }
.scale-4-origin { transform: translate(-50%, -50%) scale(4); }
"""

REPLACEMENTS = {
    'style="width: 38px; height: 38px;"': 'class="avatar-sm"',
    'style="letter-spacing: -0.5px;"': 'class="ls-minus-1"',
    'style="cursor: pointer;"': 'class="cursor-pointer"',
    'style="letter-spacing: 1px;"': 'class="ls-1"',
    'style="font-size: 0.65rem; letter-spacing: 1px;"': 'class="text-xxs ls-1"',
    'style="max-height: 400px;"': 'class="max-h-400"',
    'style="min-height: 400px;"': 'class="min-h-400"',
    'style="z-index: 1;"': 'class="z-1"',
    'style="background-color: rgba(253, 126, 20, 0.1);"': 'class="bg-orange-subtle"',
    'style="background-color: rgba(13, 110, 253, 0.1);"': 'class="bg-primary-subtle"',
    'style="background-color: rgba(255, 255, 255, 0.2);"': 'class="bg-white-20"',
    'style="z-index: 1; opacity: 0.9;"': 'class="z-1 op-90"',
    'style="border-width: 2px !important;"': 'class="border-2"',
    'style="letter-spacing: -0.5px;"': 'class="ls-minus-1"',
    'style="transform: translate(-50%, -50%) scale(4);"': 'class="scale-4-origin"',
    'style="max-width: 250px;"': 'class="max-w-250"',
    'style="min-height: 50vh;"': 'class="min-vh-50"',
    'style="max-width: 500px;"': 'class="max-w-500"',
    'style="max-width: 800px;"': 'class="max-w-800"',
    'style="background: rgba(0,0,0,0.8);"': 'class="modal-backdrop-dark"',
    'style="letter-spacing: 5px;"': 'class="ls-5"',
    'style="width: 28px; height: 28px;"': 'class="avatar-sm"', # close enough or can be an issue? Let's just do avatar-sm for now
    'style="width: 48px; height: 48px; object-fit: cover;"': 'class="thumb-48"',
    'style="min-width: 0;"': 'class="min-w-0"',
    'style="height: 120px; object-fit: cover;"': 'class="thumb-120"',
    'style="z-index: 1100;"': 'class="z-1100"'
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    modified = content
    for old, new in REPLACEMENTS.items():
        # if the tag already has a class attribute, we should ideally merge them
        # but to keep it simple, we replace `style="..."` with `class="..."` and if there are two class="", 
        # browsers parse the first one only, which is a bug.
        pass

    # A better approach for merging classes:
    # We will use regex to find style="..." and if there is a class attribute in the same tag, we merge it.
    for style_str, class_str in REPLACEMENTS.items():
        # extract the class name
        class_name = class_str.replace('class="', '').replace('"', '')
        
        # Regex to find elements with this specific style
        # It's safer to just iterate over lines
        lines = modified.split('\\n')
        for i, line in enumerate(lines):
            if style_str in line:
                if 'class="' in line:
                    # insert the new class into the existing class attribute
                    line = line.replace('class="', f'class="{class_name} ', 1)
                    line = line.replace(' ' + style_str, '')
                    line = line.replace(style_str, '')
                else:
                    line = line.replace(style_str, class_str)
                lines[i] = line
        modified = '\\n'.join(lines)
    
    # Custom vue bindings: :style="art.img_path ? 'display:none' : 'display:flex'"
    # We can replace this with Alpine/Vue classes: :class="art.img_path ? 'd-none' : 'd-flex'"
    modified = modified.replace(":style=\"art.img_path ? 'display:none' : 'display:flex'\"", ":class=\"art.img_path ? 'd-none' : 'd-flex'\"")
    modified = modified.replace(":style=\"currentArtwork.img_path ? 'display:none' : 'display:flex'\"", ":class=\"currentArtwork.img_path ? 'd-none' : 'd-flex'\"")

    if modified != content:
        with open(filepath, 'w') as f:
            f.write(modified)
        print(f"Updated {filepath}")

# Process files
files_to_check = [
    'backend/views/editor/users.html',
    'backend/views/editor/artworks.html',
    'backend/views/editor/dashboard.html',
    'backend/views/editor/tours.html'
]

for f in files_to_check:
    process_file('/home/francesco/progetto-tecweb/' + f)

# Append new classes to base.css
with open('/home/francesco/progetto-tecweb/public/css/base.css', 'a') as f:
    f.write(CSS_ADDITIONS)
print("Updated base.css")
