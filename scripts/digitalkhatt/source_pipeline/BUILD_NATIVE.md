# Reproducing the native source experiment

This is a build-time research toolchain, not a library integrated into Tanween.
Use an external scratch workspace (`WORK`), never this repository or `public/`.
No sample Mushaf PDF is an input. Keep the native source and font notices.

## Source pins

- VisualMetaFont: `220658be8bad76cfe628ddf0e903c5a86e454e4f` (AGPL v3).
- Its HarfBuzz submodule: `38258fac64114c8a9ffcc778224598c475571866` (Old MIT; retain component notices).
- oldmadinafont: `adc60f3865b507684bda856d59940a7f3602be32` (OFL 1.1).
- Website corpus: `4213fab9892774f74f7164c70a70dd84a14f0215` (MIT).

Prepare `$WORK/visualmetafont`, `$WORK/oldmadinafont` and `$WORK/website` at these
pins. Initialize the engine's HarfBuzz submodule at its exact pin; its configured
SSH URL can be fetched using the corresponding official HTTPS repository when no
SSH credential is available. Do not create credentials.

Measured compiler: GCC/G++ 14.2.0. Toolchain: CMake 4.4.4, Ninja 1.13.2,
Flex 2.6.4, Bison 3.8.2, GNU M4 1.4.19, SQLite development headers. CMake/Ninja
came from PyPI into `$WORK/python-tools`. Flex/Bison/M4 were compiled from official
release sources and installed only to `$WORK/toolchain`. SQLite headers were
extracted from the official 3.50.4 amalgamation source. The native system library
was `/lib/x86_64-linux-gnu/libsqlite3.so.0`. Use your platform's legitimate
package toolchain instead when already available.

Official downloaded source checksums:

| Source | SHA-256 |
| --- | --- |
| https://ftp.gnu.org/gnu/m4/m4-1.4.19.tar.xz | 63aede5c6d33b6d9b13511cd0be2cac046f2e70fd0a07aa9573a04a82783af96 |
| https://ftp.gnu.org/gnu/bison/bison-3.8.2.tar.xz | 9bba0214ccf7f1079c5d59210045227bcf619519840ebfa80cd3849cff5a5bf2 |
| https://github.com/westes/flex/releases/download/v2.6.4/flex-2.6.4.tar.gz | e87aae032bf07c26f85ac0ed3250998c37621d95f8bd748b31f15b33c45ee995 |
| https://www.sqlite.org/2025/sqlite-amalgamation-3500400.zip | 1d3049dd0f830a025a53105fc79fd2ab9431aea99e137809d064d8ee8356b032 |

## Explicit Linux build adjustments

In the **scratch engine copy only**, change the single call in
`lib/digitalkhatt/src/otlayout/Layout/OtLayout.cpp` from
`dlopen(ff.c_str(), 0)` to `dlopen(ff.c_str(), RTLD_LAZY)`. Mode zero fails on
this Linux loader; the same plugin loaded correctly when given a valid mode.
This is the only engine source edit in the measured build. It changes loading,
not glyph generation. Preserve this modification and its AGPL source obligations
if distributing the modified tool.

Create `$WORK/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.24)
project(digitalkhatt_source_probe LANGUAGES C CXX)
set(DIGITALKHATT_BUILD_GUI OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
add_subdirectory(visualmetafont)
set(DIGITALKHATT_FONT_TARGET_NAME oldmadina_font)
add_subdirectory(oldmadinafont)
target_compile_definitions(digitalkhatt_justify PRIVATE HB_NO_PRAGMA_GCC_DIAGNOSTIC_ERROR)
```

The last definition prevents HarfBuzz's internal header from promoting safe
integer-to-double list initializer warnings in `FeatureJustifier.cpp` to errors
on GCC 14. Record this and `-Wno-error=narrowing`; do not silently present the
build as unmodified upstream defaults.

From `$WORK`, configure then build:

```sh
export PATH="$WORK/toolchain/bin:$WORK/python-tools/cmake/data/bin:$WORK/python-tools/bin:$PATH"
export PYTHONPATH="$WORK/python-tools"
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS="-I$WORK/toolchain/include" \
  -DCMAKE_CXX_FLAGS="-I$WORK/toolchain/include -Wno-error=narrowing" \
  -DFLEX_INCLUDE_DIR="$WORK/toolchain/include" \
  -DDIGITALKHATT_SQLITE3_LIBRARY=/lib/x86_64-linux-gnu/libsqlite3.so.0 \
  -DDIGITALKHATT_TOOLS_SQLITE3_LIBRARY=/lib/x86_64-linux-gnu/libsqlite3.so.0
cmake --build build --target digitalkhatt_generate_mushaf oldmadina_font -j4
cp build/oldmadinafont/liboldmadina.so oldmadinafont/liboldmadina.so
```

CMake fetched these resolved dependency commits. Verify them before trusting a
rebuild, rather than assuming tags cannot move:

- PDF-Writer v4.9.0: `3242205aae73d27f5f83b435dd680ec43c7bb734` (Apache 2.0).
- Clipper2 1.5.4: `ef88ee97c0e759792e43a2b2d8072def6c9244e8` (Boost Software License 1.0).
- PCRE2 10.47: `f454e231fe5006dd7ff8f4693fd2b8eb94333429` (see its `LICENCE` and component notices).
- glaze 7.5.0: `8b60d82c66311c145c4d03be3b556b555a9cb111` (MIT).

## One-command generation and verification steps

From the Tanween checkout, build the separate source database with the command in
README.md. Then generate the entire corpus with the explicit fitting policy:

```sh
python scripts/digitalkhatt/source_pipeline/generate_native.py \
  --generator "$WORK/build/visualmetafont/lib/digitalkhatt/digitalkhatt_generate_mushaf" \
  --font-project "$WORK/oldmadinafont/oldmadina.mp" \
  --database "$WORK/website-source.sqlite" --output "$WORK/native-candidate"
```

This uses `decl-policy`, `font-size-xscale`, `standard` shrink, page range1–604,
Force off, Tajweed off and no PDF. The default `harfbuzz`/`same-size-by-page`/
`shrink none` profile is **rejected for visual use**: it left p582 overfull.
The explicit policy is the engine's own layout, not registration to artwork.

`generate_native.py` records the executable/input/output hashes and actual run
statistics. Two independently generated fitted runs produced identical DKLY,
text sidecar and placement JSONL; manifests contain elapsed time and are not
expected to be byte-identical. The initial default-policy run was also repeated,
but its reproducibility does not fix its clipping.

Install Brotli 1.2.1 and the README's Python dependencies in your permitted
research environment. Decode, audit all604 pages and rasterize nine samples:

```sh
python scripts/digitalkhatt/source_pipeline/decode_native.py \
  --binary "$WORK/native-candidate/oldmadina.bin" \
  --sidecar "$WORK/native-candidate/oldmadina.bin.json" \
  --binary-sha256 78800d93d3864398062dfa9d13310a06311da096b8f59a56e68f245d25b7ede8 \
  --sidecar-sha256 a88ec463bf0d8df24082b01d29cda4678559ba647887ca04b13e14b434cb09fd \
  --app-pages public/mushaf/1405-artwork-5a5f9f3846158475 \
  --output "$WORK/native-candidate-proof"
```

The proof records every out-of-frame ink box and affected app word ID. It does
not change page crops to hide those cases. The 27400-unit source page height is
explicit because DKLY does not encode height; these commands intentionally use
the measured default geometry. Changing geometry requires a separate recorded
profile and decoder update, not an undocumented auto-fit.

`map_native.py` is a separate source-cluster-to-app-unit audit. Rendering and
native generation do not replace it. No script claims browser first-paint,
Safari correctness, decorative-heading licensing or the owner's visual approval.
