#!/usr/bin/env bash
# Builds the downloadable press pack under press/.
#
#   press/modernmud_presskit/   unpacked files (the page links each one)
#   press/thumbs/               small previews for the page
#   press/*.zip                 full pack + one ZIP per category
#
# Pixel art is only ever enlarged by whole numbers with nearest neighbour
# (-sample); previews are reduced by whole numbers too.
#
# Sources outside the repo (override with env vars):
#   SRC_DL      folder with the 4K captures and the enlarged cover
#   COVER_NATIVE  412x237 cover from godot-mud
#   FONT_LOGO   Cinzel Decorative Black (the Steam wordmark font)
#   STEAM_DIR   Steam capsules downloaded from the public store page
#
# Run it inside a memory cap, e.g.:
#   systemd-run --user --scope -q -p MemoryMax=2G tools/build-press-pack.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DL="${SRC_DL:-$HOME/Descargas}"
GODOT="${GODOT:-/mnt/StorageSSD/Work/mud/godot-mud/modernmud}"
COVER_NATIVE="${COVER_NATIVE:-$GODOT/assets/menu/cover_native.png}"
FONT_LOGO="${FONT_LOGO:-$GODOT/ui/fonts/CinzelDecorative-Black.otf}"
STEAM_DIR="${STEAM_DIR:-/mnt/StorageSSD/Work/mud/scratch/presskit_src/steam}"

OUT="$ROOT/press"
PK="$OUT/modernmud_presskit"
TH="$OUT/thumbs"
export MAGICK_TEMPORARY_PATH="${MAGICK_TEMPORARY_PATH:-/mnt/StorageSSD/Work/mud/scratch}"
IM=(magick -limit memory 1GiB -limit map 2GiB)

rm -rf "$PK" "$TH" "$OUT"/*.zip
mkdir -p "$PK"/{logo,screenshots/4k,screenshots/1080p,key_art/cover,key_art/steam,key_art/room_art} "$TH"

# ---------- logo ----------
# Wordmark = "MODERN MUD" in Cinzel Decorative Black, the same lettering as
# the Steam capsules. Light version for dark backgrounds, dark for light ones.
for w in 1000 2000 4000; do
  pad=$(( w / 25 ))
  inner=$(( w - 2 * pad ))
  for v in light dark; do
    if [ "$v" = light ]; then fill='#ffffff'; else fill='#141112'; fi
    # Each word is set apart and joined with an explicit gap: at this weight
    # Cinzel's own space is so narrow that it reads «MODERNMUD».
    "${IM[@]}" -background none -fill "$fill" -font "$FONT_LOGO" -pointsize 400 \
      \( label:'MODERN' -trim +repage \) \( -size 130x1 xc:none +size \) \( label:'MUD' -trim +repage \) \
      -gravity south +append -trim +repage -resize "${inner}x" -bordercolor none -border "$pad" \
      "PNG32:$PK/logo/modernmud_logo_${v}_${w}w.png"
  done
done

# Icon: square crop of the cover (castle + wanderer), whole-number enlargements.
for s in 1 5 10; do
  px=$(( 200 * s ))
  "${IM[@]}" "$COVER_NATIVE" -crop 200x200+106+37 +repage -sample "$((s * 100))%" \
    -alpha off "PNG24:$PK/logo/modernmud_icon_${px}x${px}.png"
done

# ---------- screenshots ----------
cp_shot() { cp "$1" "$PK/screenshots/$2"; }
cp_shot "$SRC_DL/modernmud_ingame_plaza_4k.png"            4k/modernmud_ingame_village_square_3840x2160.png
cp_shot "$SRC_DL/modernmud_ingame_dialogo_4k.png"          4k/modernmud_ingame_npc_conversation_3840x2160.png
cp_shot "$SRC_DL/modernmud_ingame_combate_4k.png"          4k/modernmud_ingame_tactical_combat_3840x2160.png
cp_shot "$SRC_DL/modernmud_esqueleto_risueno_4k.png"       4k/modernmud_cinematic_laughing_skeleton_3840x2160.png
cp_shot "$SRC_DL/modernmud_casa_clara_4k.png"              4k/modernmud_cinematic_house_entrance_3840x2160.png

S="$ROOT/assets/shots"
cp_shot "$S/market.jpg"     1080p/modernmud_moon_market_1920x1080.jpg
cp_shot "$S/shell-game.jpg" 1080p/modernmud_shell_game_1920x1080.jpg
cp_shot "$S/tovar.jpg"      1080p/modernmud_talking_to_one_eyed_tovar_1920x1080.jpg
cp_shot "$S/combat.jpg"     1080p/modernmud_street_combat_1920x1080.jpg
cp_shot "$S/guards.jpg"     1080p/modernmud_town_watch_arrives_1920x1080.jpg
cp_shot "$S/torch.jpg"      1080p/modernmud_torch_in_the_cellar_1920x1080.jpg
cp_shot "$S/cemetery.jpg"   1080p/modernmud_cemetery_1920x1080.jpg
cp_shot "$S/law.jpg"        1080p/modernmud_examining_the_watch_1920x1080.jpg
cp_shot "$S/creation.jpg"   1080p/modernmud_character_creation_1920x1080.jpg

# ---------- key art ----------
# Cover: 412x237 native, enlarged x4, x5, x10, x20 (nearest neighbour).
for s in 1 4 5 10 20; do
  "${IM[@]}" "$COVER_NATIVE" -sample "$((s * 100))%" -alpha off \
    "PNG24:$PK/key_art/cover/modernmud_key_art_$((412 * s))x$((237 * s)).png"
done

cp "$STEAM_DIR/header_2x.jpg"          "$PK/key_art/steam/modernmud_steam_header_920x430.jpg"
cp "$STEAM_DIR/capsule_616x353.jpg"    "$PK/key_art/steam/modernmud_steam_capsule_616x353.jpg"
cp "$STEAM_DIR/capsule_231x87.jpg"     "$PK/key_art/steam/modernmud_steam_capsule_231x87.jpg"
cp "$STEAM_DIR/library_hero_2x.jpg"    "$PK/key_art/steam/modernmud_steam_library_hero_3840x1240.jpg"

A="$ROOT/assets/art"
cp "$A/sv_pueblo_11.jpg"          "$PK/key_art/room_art/modernmud_room_village_1_3072x1024.jpg"
cp "$A/sv_pueblo_14.jpg"          "$PK/key_art/room_art/modernmud_room_village_2_3072x1024.jpg"
cp "$A/sv_pueblo_23.jpg"          "$PK/key_art/room_art/modernmud_room_village_3_3072x1024.jpg"
cp "$A/sv_linde_cem_01.jpg"       "$PK/key_art/room_art/modernmud_room_cemetery_edge_1_3072x1024.jpg"
cp "$A/sv_linde_cem_03.jpg"       "$PK/key_art/room_art/modernmud_room_cemetery_edge_2_3072x1024.jpg"
cp "$A/sv_cueva_esqueleto_02.jpg" "$PK/key_art/room_art/modernmud_room_skeleton_cave_3072x1024.jpg"
cp "$A/sv_ruina_04.jpg"           "$PK/key_art/room_art/modernmud_room_ruins_1_3072x1024.jpg"
cp "$A/sv_ruina_05.jpg"           "$PK/key_art/room_art/modernmud_room_ruins_2_3072x1024.jpg"

# ---------- texts ----------
cp "$ROOT/tools/press-texts/fact_sheet.md" "$PK/fact_sheet.md"
cp "$ROOT/tools/press-texts/LICENSE.txt"   "$PK/LICENSE.txt"

# ---------- previews for the page ----------
for f in "$PK"/screenshots/4k/*.png; do
  "${IM[@]}" "$f" -filter box -resize 16.6667% -quality 84 "$TH/$(basename "${f%.*}").jpg"   # /6 -> 640x360
done
for f in "$PK"/screenshots/1080p/*.jpg; do
  "${IM[@]}" "$f" -filter box -resize 33.3334% -quality 84 "$TH/$(basename "${f%.*}").jpg"   # /3 -> 640x360
done
"${IM[@]}" "$COVER_NATIVE" -sample 200% -alpha off "$TH/modernmud_key_art.png"             # x2 -> 824x474
for f in "$PK"/key_art/room_art/*.jpg; do
  "${IM[@]}" "$f" -filter box -resize 25% -quality 84 "$TH/$(basename "${f%.*}").jpg"        # /4 -> 768x256
done
"${IM[@]}" "$PK/key_art/steam/modernmud_steam_header_920x430.jpg" -filter box -resize 50% -quality 86 "$TH/modernmud_steam_header.jpg"
cp "$PK/logo/modernmud_logo_light_1000w.png" "$TH/modernmud_logo_light.png"
cp "$PK/logo/modernmud_logo_dark_1000w.png"  "$TH/modernmud_logo_dark.png"
"${IM[@]}" "$COVER_NATIVE" -crop 200x200+106+37 +repage -alpha off "$TH/modernmud_icon.png"   # x1 (CSS enlarges it pixelated)

# ---------- ZIPs ----------
python3 -I - "$OUT" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
base = os.path.join(out, "modernmud_presskit")
STAMP = (2026, 1, 1, 0, 0, 0)

def files_under(rel):
    root = os.path.join(base, rel)
    for d, _, fs in os.walk(root):
        for f in sorted(fs):
            yield os.path.join(d, f)

def make(name, rels, extra=("fact_sheet.md", "LICENSE.txt")):
    paths = []
    for r in rels:
        paths += sorted(files_under(r)) if os.path.isdir(os.path.join(base, r)) else [os.path.join(base, r)]
    paths += [os.path.join(base, e) for e in extra if os.path.join(base, e) not in paths]
    with zipfile.ZipFile(os.path.join(out, name), "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(set(paths)):
            arc = os.path.join("modernmud_presskit", os.path.relpath(p, base))
            info = zipfile.ZipInfo(arc, STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            with open(p, "rb") as fh:
                z.writestr(info, fh.read())

make("modernmud_presskit.zip", ["logo", "screenshots", "key_art", "fact_sheet.md", "LICENSE.txt"])
make("modernmud_logos.zip", ["logo"])
make("modernmud_screenshots.zip", ["screenshots"])
make("modernmud_key_art.zip", ["key_art"])
PY

du -sh "$PK" "$TH" "$OUT"/*.zip
