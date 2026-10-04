#!/usr/bin/env python3
"""usage: docupd.py ITEM 'report status text' 'checklist suffix' ['extra section text for the report']"""
import re,sys
root='/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/'
item,status,suffix=sys.argv[1],sys.argv[2],sys.argv[3]
extra=sys.argv[4] if len(sys.argv)>4 else ''
p=root+'docs/RECURRING_ERRORS_REPORT.md'
L=open(p).read().split('\n')
i=next(k for k,l in enumerate(L) if re.match(rf'\|\s*{item} ',l))
c=L[i].strip().strip('|').split(' | ')
c[1]=status+' (was: '+re.sub(r'\*\*','',c[1])[:60]+'...)'
L[i]='| '+' | '.join(x.strip() for x in c)+' |'
s='\n'.join(L)
if extra: s=s.rstrip('\n')+'\n\n'+extra+'\n'
open(p,'w').write(s)
c2=root+'docs/APP_CHECKLIST.md'
T=open(c2).read().split('\n')
j=next(k for k,l in enumerate(T) if re.match(rf'- \[[ x]\] #{item}[ /]',l))
T[j]=re.sub(r' \[IN PROGRESS[^\]]*\]','',T[j])+' '+suffix
open(c2,'w').write('\n'.join(T))
print('updated',item)
