#!/usr/bin/env bash
# Foreground Codex job runner. Launch it with Bash run_in_background:true and NO
# nohup and NO trailing '&': the completion notice then fires when the job really
# ends (a nohup/& launcher exits at once and gives a false "completed").
#
# usage: delegate-run NAME WORKTREE EFFORT BRIEF_DIR BRIEF_ID [MODEL]
#   reads BRIEF_DIR/COMMON.md, EXEC.md and BRIEF_ID.md; writes
#   BRIEF_DIR/../logs/NAME.log and NAME-final.md; prints a one-screen summary.
# Provider/model/cost are the same disclosure as .claude/bin/delegate (AGENTS.md rule 3).
# DELEGATE_RUN_DRY=1 skips Codex and only prints what would run (for testing).
set -uo pipefail

[ $# -ge 5 ] || { echo "usage: delegate-run NAME WORKTREE EFFORT BRIEF_DIR BRIEF_ID [MODEL]" >&2; exit 2; }
name=$1; worktree=$2; effort=$3; briefs=$4; brief=$5; model=${6:-gpt-5.6-luna}
logs="$briefs/../logs"; mkdir -p "$logs"
final="$logs/$name-final.md"; log="$logs/$name.log"
cost="included in ChatGPT Plus, usage-capped (no per-token charge)"
here=$(dirname "$(readlink -f "$0")")

prompt="Read $briefs/COMMON.md, $briefs/EXEC.md and $briefs/$brief.md in that order, then do the task exactly as written. Do not stop because git stash is blocked; use the temp-copy proof described in the brief."

echo "DELEGATE-RUN $name: provider=codex model=$model effort=$effort cost=\"$cost\" worktree=$worktree"
if [ "${DELEGATE_RUN_DRY:-}" = 1 ]; then echo "dry run, not launching: $prompt"; exit 0; fi

rm -f "$final"
start=$(date +%s)
"$here/delegate" codex --model "$model" --effort "$effort" --cost "$cost" -- \
  -s workspace-write -C "$worktree" -o "$final" "$prompt" > "$log" 2>&1
code=$?
mins=$(( ($(date +%s) - start) / 60 ))

echo "FINISHED $name: exit=$code after ${mins} min"
[ -s "$final" ] && { echo "--- final message ---"; head -c 1500 "$final"; echo; } || echo "no final message was written (check $log)"
[ -f "$worktree/AGENT_REPORT.md" ] && echo "report: $worktree/AGENT_REPORT.md" || echo "no AGENT_REPORT.md in the worktree"
echo "changed files:"; git -C "$worktree" status --short | grep -v "tests/.cache" | head -15
exit $code
