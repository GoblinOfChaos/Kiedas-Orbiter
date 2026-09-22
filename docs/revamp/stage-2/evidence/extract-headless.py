import pathlib,subprocess,os,stat
base=pathlib.Path('/var/home/jedwards/kiedas-orbiter/.preview-work'); root=base/'headless-root';root.mkdir(exist_ok=True)
for rpm in sorted((base/'headless-rpms').glob('*.rpm')):
    verified=subprocess.run(['rpmkeys','--checksig',str(rpm)],capture_output=True,text=True)
    if verified.returncode: raise RuntimeError(verified.stdout+verified.stderr)
    print(verified.stdout.strip())
    data=subprocess.check_output(['rpm2cpio',str(rpm)]);offset=0
    while offset+110<=len(data):
        header=data[offset:offset+110];assert header[:6] in (b'070701',b'070702')
        fields=[int(header[6+i*8:14+i*8],16) for i in range(13)];mode=fields[1];size=fields[6];namesize=fields[11]
        offset+=110;name=data[offset:offset+namesize-1].decode();offset=(offset+namesize+3)&~3
        payload=data[offset:offset+size];offset=(offset+size+3)&~3
        if name=='TRAILER!!!':break
        relative=pathlib.PurePosixPath(name)
        if relative.is_absolute() or '..' in relative.parts: raise RuntimeError('Unsafe archive path')
        path=root/relative
        if not path.resolve().is_relative_to(root.resolve()):raise RuntimeError('Unsafe archive link')
        if stat.S_ISDIR(mode):path.mkdir(parents=True,exist_ok=True)
        elif stat.S_ISREG(mode):
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(payload);path.chmod(mode&0o777)
        elif stat.S_ISLNK(mode):
            target=payload.decode()
            if pathlib.Path(target).is_absolute() or not (path.parent/target).resolve().is_relative_to(root.resolve()):continue
            path.parent.mkdir(parents=True,exist_ok=True)
            if not path.exists():path.symlink_to(target)
print('Extracted signed RPMs without installing packages')
