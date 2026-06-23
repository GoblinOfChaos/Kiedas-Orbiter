# FAQ

## Is this safe to use? Will I get banned for this?
As with all 3rd party software, use this at your own risk. It's open source and thus every single line of code is available for you or anyone else to inspect in the repo. Concerning account security, due to the nature of this being unofficial 3rd party software, Digital Extremes will never endorse or support it, which leaves us to trust their goodwill and their track record with other 3rd party apps.

**This app is not affiliated with Digital Extremes. Use at your own risk.**

## What platforms does this work on?
Currently this app works on **Windows**, **Linux**, and **macOS**.<br>It should however be noted that:
- macOS builds haven't been tested yet due to lack of opportunity.
- Linux builds may be unstable due to variety in Linux distributions and configurations.
- Game needs to be running in borderless fullscreen for overlays to work.

## How does this work?
This app is built on a cross-platform stack consisting of Tauri and React. It uses a custom made version of [warframe-api-helper](https://github.com/Sainan/warframe-api-helper) to both fetch your inventory data from Warframe's API and read your EE.log in real-time. It parses this data and renders it in a way that's hopefully useful to you. For more details see [ARCHITECTURE.md](https://github.com/glowseeker/cephalon-kronos/blob/main/ARCHITECTURE.md).

## Is it free to use? Does it have ads?
1. Yes, it's completely free and open-source.
2. No, it does not have any ads.

## Does it do ... ?
Probably; most information that the game exposes is made use of to an extent. For a full list, check the wiki under [features](https://github.com/glowseeker/cephalon-kronos/wiki/Features). If there's something you'd like to see get added or you found a bug, feel free to open an issue on the [issues page](https://github.com/glowseeker/cephalon-kronos/issues)!
