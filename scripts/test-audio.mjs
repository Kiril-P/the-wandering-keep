import { build } from 'esbuild';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['src/audio/score.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {audioPreferences,DEFAULT_AUDIO,frequency,phraseNotes}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
for(const invalid of [null,undefined,'',[],{},17])assert.deepEqual(audioPreferences(invalid),DEFAULT_AUDIO);
assert.deepEqual(audioPreferences({muted:true,music:5,ambience:-3,effects:NaN}),{muted:true,music:1,ambience:0,effects:.6});
assert.deepEqual(audioPreferences({music:0,ambience:0,effects:0}),{muted:false,music:0,ambience:0,effects:0});
assert.equal(frequency(69),440);
for(let region=0;region<=2;region++)for(let phrase=0;phrase<100;phrase++){
 const score=phraseNotes(phrase,region);assert.equal(score.chord.length,5);assert.ok(score.melody.length>=2&&score.melody.length<=5);
 assert.ok(score.melody.every(n=>n.offset>0&&n.offset<16&&frequency(n.note)>100&&frequency(n.note)<1800));
 assert.deepEqual(score,phraseNotes(phrase,region));
}
console.log('PASS Audio preference defaults/clamping, independent zero volumes, deterministic phrases, and bounded musical register');
