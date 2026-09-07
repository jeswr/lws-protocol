import { readFile, writeFile } from 'node:fs/promises';
import { VocabGeneration } from 'yml2vocab';

// The dependency's CLI logs conversion errors without failing the process.
// Use its throwing API so CI cannot pass with a stale generated context.
const directory = new URL('./', import.meta.url);
const [source, template] = await Promise.all([
  readFile(new URL('vocabulary.yml', directory), 'utf8'),
  readFile(new URL('template.html', directory), 'utf8'),
]);
const vocabulary = new VocabGeneration(source);
// ODRL and ActivityStreams both use the compact term target. Keep ODRL
// target local to access objects so appending the ActivityStreams context is valid.
const contextDocument = JSON.parse(vocabulary.getContext());
const context = contextDocument["@context"];
const policyTarget = context.target;
if (policyTarget?.["@id"] !== "http://www.w3.org/ns/odrl/2/target") {
  throw new Error("Unexpected generated ODRL target definition");
}
delete context.target;
context.access["@context"] = { target: policyTarget };
context.AccessPolicy = { "@id": "https://www.w3.org/ns/lws#AccessPolicy", "@context": { target: policyTarget } };
const outputs = {
  'vocabulary.ttl': vocabulary.getTurtle(),
  'vocabulary.jsonld': vocabulary.getJSONLD(),
  'vocabulary.context.jsonld': JSON.stringify(contextDocument, null, 2) + '\n',
  'index.html': vocabulary.getHTML(template, 'vocabulary', true),
};
await Promise.all(Object.entries(outputs).map(([name, content]) =>
  writeFile(new URL(name, directory), content)));
