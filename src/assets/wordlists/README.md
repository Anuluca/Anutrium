# English analysis wordlist

- Source: https://raw.githubusercontent.com/en-wl/wordlist-diff/71d7dd07676edb60ade43552e10b41314b7e9287/en_US.txt
- Release: ESDB 2026.02.25, en_US standard / size 60.
- Filter: unique existing lowercase ASCII words, at least three letters. This does not imply semantic meaning or everyday usage.
- Entries: 79164.
- Raw bytes: 754225; gzip level 9: 213345 bytes.
- Rebuild: `node scripts/build-english-wordlist.mjs`. No network access is needed during normal application builds.
- Copyright and permission are embedded in the served wordlist; full upstream notices are retained in LICENSE.txt.
