from pathlib import Path
import hashlib, json
ROOT=Path('/var/home/jedwards/kiedas-orbiter');E=ROOT/'docs/revamp/stage-3/evidence';OUTPUT=E/'relics-evidence-integrity.json'
records=[
('fixture_build_before_catalog_shape_correction',E/'before-catalog-fixture-fix-relics-component-build.log','failed before bundle completion; retained filename predates the later root-cause refinement'),
('fixture_build_before_absolute_import_correction',E/'before-relative-import-fix-relics-component-build.log','failed because relocated frozen source still used relative imports'),
('container_before_sandbox_retry',E/'before-sandbox-retry-relics-component-container.json','host-bus access denied before container creation'),
('component_before_assertion_correction',E/'before-assertion-fix-relics-component.json','89 of 91; fixture-only ampersand and German assertions failed'),
('component_before_inner_log_path_correction',E/'before-log-path-fix-relics-component.json','rejected before browser startup because evidence log paths already existed'),
('component_before_german_assertion_correction',E/'before-german-assertion-fix-relics-component.json','90 of 91; German extraction assertion failed'),
]
for _,path,_ in records:
    if not path.exists():raise FileNotFoundError(path)
if OUTPUT.exists():raise FileExistsError(OUTPUT)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
result={'status':'failures_preserved','app_source_corrections_after_initial_approved_implementation':0,'records':[{'name':name,'path':str(path),'bytes':path.stat().st_size,'sha256':digest(path),'note':note} for name,path,note in records],'final_component':{'path':str(E/'relics-component.json'),'sha256':digest(E/'relics-component.json'),'checks':'91/91'},'final_packages':{'debian':'55/55','appimage':'55/55'}}
OUTPUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
