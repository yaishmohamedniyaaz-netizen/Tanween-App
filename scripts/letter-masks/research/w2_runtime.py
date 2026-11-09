"""Record the actual numerical/runtime environment used for the reconstructed pilot."""
import importlib.metadata as md,platform,sys
from pathlib import Path
import torch,numpy,PIL,scipy
from common import write,HERE
packages=['torch','numpy','Pillow','scipy','sympy','mpmath','networkx','typing_extensions','fsspec','filelock','Jinja2','MarkupSafe','setuptools','uharfbuzz','freetype-py','scikit-image','fonttools','brotli']
versions={}
for n in packages:
    try:versions[n]=md.version(n)
    except md.PackageNotFoundError:versions[n]=None
write(HERE/'w2_runtime.json',{'reconstructed':True,'python':sys.version,'platform':platform.platform(),'machine':platform.machine(),'packages':versions,'torchConfig':torch.__config__.show(),'trainingThreads':2,'seed':20261108,'venvIncludesSystemSitePackages':'include-system-site-packages = true' in (Path(sys.prefix)/'pyvenv.cfg').read_text()})
print('Recorded actual runtime; see w2_runtime.json for package versions and isolation status')
