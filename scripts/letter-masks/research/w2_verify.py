"""Compare fresh independent training runs and fresh repeated inference, never fabricate identity."""
import json,hashlib
from pathlib import Path
from common import ROOT,HERE,write
cache=ROOT/'tmp/letter-positions/w2'
a=json.loads((cache/'primary/results.json').read_text());b=json.loads((cache/'duplicate/results.json').read_text())
old='b93d5045617db3b92906d1bffcd37f30a9f2a0436ebb763790f8807e9981fdc3'
result={'status':'new reconstruction validation; original lost files not recovered','primaryPredictionSha256':a['prediction_sha256'],'duplicatePredictionSha256':b['prediction_sha256'],'predictionFilesIdentical':(cache/'primary/predictions.json').read_bytes()==(cache/'duplicate/predictions.json').read_bytes(),'tensorStatesIdentical':a['model_tensor_sha256']==b['model_tensor_sha256'],'primaryModelTensorSha256':a['model_tensor_sha256'],'duplicateModelTensorSha256':b['model_tensor_sha256'],'historicalPredictionHashFromRetainedHistory':old,'matchesHistoricalPredictionHash':a['prediction_sha256']==old,'primaryTrainingSeconds':a['history'][-1]['elapsed_s'],'duplicateTrainingSeconds':b['history'][-1]['elapsed_s'],'primaryTrainingEpochs':a['history'][-1]['epoch'],'duplicateTrainingEpochs':b['history'][-1]['epoch']}
pre=cache/'primary/predictions-before-reuse.json'
result['repeatInferenceChecked']=pre.exists()
result['repeatInferenceIdentical']=pre.read_bytes()==(cache/'primary/predictions.json').read_bytes() if pre.exists() else None
write(HERE/'w2_reconstruction_validation.json',result)
print(json.dumps(result,indent=2))
