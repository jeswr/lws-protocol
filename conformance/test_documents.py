"""Executable RDF examples and profile rejection vectors; no network context loading."""
import json
import re
import unittest
from pathlib import Path
from unittest.mock import patch

from pyshacl import validate
from rdflib import BNode, Graph, Literal, Namespace, RDF, URIRef, XSD
from rdflib.compare import isomorphic

ROOT = Path(__file__).resolve().parents[1]
FIX = ROOT / "conformance/fixtures"
LWS = Namespace("https://www.w3.org/ns/lws#")
ODRL = Namespace("http://www.w3.org/ns/odrl/2/")
CONTEXT_URL = "https://www.w3.org/ns/lws/v1"


def rdf(name):
    path = FIX / name
    if path.suffix == ".jsonld":
        data = json.loads(path.read_text())
        context = json.loads((ROOT / "lws10-vocab/vocabulary.context.jsonld").read_text())["@context"]
        entries = data["@context"] if isinstance(data["@context"], list) else [data["@context"]]
        local_contexts = {CONTEXT_URL: context, "https://www.w3.org/ns/cid/v1": json.loads((FIX / "cid.context.jsonld").read_text())["@context"]}
        data["@context"] = [local_contexts.get(x, x) if isinstance(x, str) else x for x in entries]
        with patch("urllib.request.urlopen", side_effect=AssertionError("network context resolution forbidden")):
            return Graph().parse(data=json.dumps(data), format="json-ld")
    return Graph().parse(path, format="turtle")


def conforms(graph, shape="odrl", listing=None):
    shapes = Graph().parse(ROOT / f"conformance/shapes/{shape}.ttl", format="turtle")
    if listing:
        shapes.add((URIRef("urn:lws:shape:Container"), URIRef("http://www.w3.org/ns/shacl#targetNode"), listing))
    return validate(graph, shacl_graph=shapes, inference="none")[0]


class RepresentationTests(unittest.TestCase):
    def test_fixed_cid_storage_and_turtle_preserve_service_and_capability_model(self):
        self.assertTrue(isomorphic(rdf("storage.ttl"), rdf("storage.jsonld")))
        self.assertTrue(conforms(rdf("storage.jsonld"), "representations"))

    def test_container_serializations_preserve_same_rdf(self):
        self.assertTrue(isomorphic(rdf("container.ttl"), rdf("container.jsonld")))
        self.assertTrue(conforms(rdf("container.ttl"), "representations"))

    def test_renamed_jsonld_aliases_and_flat_nodes_preserve_model(self):
        graph = rdf("container.ttl")
        # Expanded JSON-LD has different layout and no compact property names.
        expanded = graph.serialize(format="json-ld", auto_compact=False)
        with patch("urllib.request.urlopen", side_effect=AssertionError("network forbidden")):
            parsed = Graph().parse(data=expanded, format="json-ld")
        self.assertTrue(isomorphic(graph, parsed))
        self.assertTrue(conforms(parsed, "representations"))

    def test_empty_container_has_no_membership_statement(self):
        graph = Graph().parse(data='@prefix lws: <https://www.w3.org/ns/lws#> . <https://storage.example/empty> a lws:Container ; lws:totalItems 0 .', format="turtle")
        self.assertTrue(conforms(graph, "representations"))
        self.assertEqual(list(graph.objects(None, LWS.items)), [])

    def test_missing_format_or_negative_count_rejected(self):
        for mutate in (lambda g: g.remove((None, URIRef("http://purl.org/dc/terms/format"), None)),
                       lambda g: g.set((URIRef("https://storage.example/root/"), LWS.totalItems, Literal(-1)))):
            graph = rdf("container.ttl")
            mutate(graph)
            self.assertFalse(conforms(graph, "representations"))

    def test_turtle_only_discovery_example(self):
        from html import unescape
        text = (ROOT / "lws10-core/Discovery.html").read_text()
        turtle = re.search(r'title="Turtle-only storage description">(.*?)</pre>', text, re.S).group(1)
        graph = Graph().parse(data=unescape(turtle), format="turtle")
        self.assertTrue(conforms(graph, "representations"))
        self.assertEqual(set(graph.objects(None, LWS.produces)), {Literal("text/turtle")})
        self.assertEqual(set(graph.objects(None, LWS.appliesTo)), {LWS.Storage, LWS.Container})

    def test_listing_subject_requires_count_but_nested_container_does_not(self):
        graph = rdf("container.ttl")
        subject = URIRef("https://storage.example/root/")
        child = URIRef("https://storage.example/root/child/")
        graph.add((subject, LWS.items, child)); graph.add((child, RDF.type, LWS.Container))
        self.assertTrue(conforms(graph, "representations", listing=subject))
        graph.remove((subject, LWS.totalItems, None))
        self.assertFalse(conforms(graph, "representations", listing=subject))

    def test_unrelated_capability_cannot_replace_required_representation_coverage(self):
        from html import unescape
        text = (ROOT / "lws10-core/Discovery.html").read_text()
        turtle = re.search(r'title="Turtle-only storage description">(.*?)</pre>', text, re.S).group(1)
        for required_class in (LWS.Storage, LWS.Container):
            graph = Graph().parse(data=unescape(turtle), format="turtle")
            graph.remove((None, LWS.appliesTo, required_class))
            graph.add((BNode(), RDF.type, LWS.AuthorizationBindingCapability))
            self.assertFalse(conforms(graph, "representations"))


class PolicyTests(unittest.TestCase):
    def test_request_jsonld_and_turtle_preserve_constraints(self):
        self.assertTrue(isomorphic(rdf("request.ttl"), rdf("request.jsonld")))
        self.assertTrue(conforms(rdf("request.jsonld")))

    def test_approved_set_envelope(self):
        graph = rdf("request.ttl")
        graph.set((URIRef("https://requests.example/123"), RDF.type, LWS.AccessGrant))
        graph.set((URIRef("https://requests.example/123#policy"), RDF.type, ODRL.Set))
        self.assertTrue(conforms(graph))

    def test_request_cannot_be_a_grant(self):
        graph = rdf("request.ttl")
        graph.set((URIRef("https://requests.example/123"), RDF.type, LWS.AccessGrant))
        self.assertFalse(conforms(graph))

    def test_missing_assignee_rejected(self):
        graph = rdf("request.ttl"); graph.remove((None, ODRL.assignee, None))
        self.assertFalse(conforms(graph))

    def test_unknown_constraint_and_duty_rejected(self):
        for predicate in (ODRL.duty, URIRef("https://example.org/hiddenCondition")):
            graph = rdf("request.ttl")
            rule = graph.value(URIRef("https://requests.example/123#policy"), ODRL.permission)
            graph.add((rule, predicate, BNode()))
            self.assertFalse(conforms(graph))

    def test_unknown_profile_and_action_rejected(self):
        for predicate in (ODRL.profile, ODRL.action):
            graph = rdf("request.ttl")
            subject = next(graph.subjects(predicate, None))
            graph.set((subject, predicate, URIRef("https://example.org/unsupported")))
            self.assertFalse(conforms(graph))

    def test_untyped_time_or_timezone_free_value_rejected(self):
        for value in (Literal("2027-01-01T00:00:00Z"), Literal("2027-01-01T00:00:00", datatype=XSD.dateTime)):
            graph = rdf("request.ttl")
            subject = next(graph.subjects(ODRL.rightOperand, None))
            graph.set((subject, ODRL.rightOperand, value))
            self.assertFalse(conforms(graph))

    def test_string_iri_cannot_silently_become_an_assignee(self):
        graph = rdf("request.ttl")
        subject = next(graph.subjects(ODRL.assignee, None))
        graph.set((subject, ODRL.assignee, Literal("https://agent.example/id")))
        self.assertFalse(conforms(graph))


class EditorialTests(unittest.TestCase):
    def test_shopping_list_length_matches_explicit_lf_octets(self):
        text = (ROOT / "lws10-core/Operations/read-resource.md").read_text()
        match = re.search(r"Content-Length: (\d+).*?\n\n(milk\n.*?)```", text, re.S)
        self.assertEqual(int(match[1]), len(match[2].encode("utf-8")))

    def test_current_core_has_no_obsolete_http_references(self):
        for path in (ROOT / "lws10-core").rglob("*"):
            if path.suffix in (".md", ".html") and "SNAPSHOTS" not in path.parts:
                self.assertNotRegex(path.read_text(), r"\[\[!?RFC(?:723[123]|7386|5785)\]\]", str(path))


if __name__ == "__main__":
    unittest.main()
