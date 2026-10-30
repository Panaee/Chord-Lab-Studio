/* Sets the icon and version info of the Windows exe without Wine (resedit, pure JS).
   Usage: node installer/windows/set-icon.mjs "dist/win-unpacked/Chord Lab Studio.exe" assets/icon.ico 1.7.0 */
import fs from 'node:fs';
import * as ResEdit from 'resedit';
import * as PELibrary from 'pe-library';
const [exePath, icoPath, version] = process.argv.slice(2);
const exe = PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(exe);
const before = res.entries.map(e => `${e.type}:${e.id}:${e.lang}`);
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const icon = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
const target = groups[0] || { id: 1, lang: 1033 };
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, target.id, target.lang, icon.icons.map(i => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
const [a, b, c] = version.split('.').map(Number);
const lang = vi.getAllLanguagesForStringValues()[0] || { lang: 1033, codepage: 1200 };
vi.setStringValues(lang, { FileDescription: 'Chord Lab Studio', ProductName: 'Chord Lab Studio', InternalName: 'Chord Lab Studio', OriginalFilename: 'Chord Lab Studio.exe', FileVersion: version, ProductVersion: version, LegalCopyright: '' });
vi.setFileVersion(a, b, c, 0, lang.lang); vi.setProductVersion(a, b, c, 0, lang.lang);
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
const after = PELibrary.NtExecutableResource.from(PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true })).entries.map(e => `${e.type}:${e.id}:${e.lang}`);
console.log('icon group', target.id, 'icons', icon.icons.length, '| resources before', before.length, 'after', after.length, '| kept:', before.filter(x => !after.includes(x)).length === 0);
