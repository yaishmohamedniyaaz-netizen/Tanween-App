# -*- coding: utf-8 -*-
import io,re
from spec2 import HEAD
files=['m_a.html','m_b.html','m_c.html','m_d.html','m_e.html','m_f.html','m_g.html']
body=''
for f in files:
    s=io.open(f,encoding='utf-8').read()
    i=s.index('</style>')+len('</style>')
    body+=s[i:]
n=body.count('class="pg"')+body.count('class="dv"')
css=HEAD.replace('</style>','.pg,.dv{page-break-after:always;margin-bottom:0}\n</style>')
io.open('manual2.html','w',encoding='utf-8').write(css+body)
print('pages',n)
