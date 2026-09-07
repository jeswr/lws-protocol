export function selectActor(configuration, actor = 'owner') {
  if (!['owner', 'outsider'].includes(actor)) throw new Error('Unknown fixture actor.');
  return { ...configuration, subject_token: actor === 'outsider' ? configuration.outsider_subject_token : configuration.subject_token };
}

export function grantResource(location, collection) {
  if (typeof location !== 'string' || !location.trim()) throw new Error('Missing grant Location; stop the fixture before rerunning.');
  const base = new URL(collection);
  const target = new URL(location, base);
  const prefix = base.pathname.replace(/\/$/, '') + '/';
  const segment = target.pathname.slice(prefix.length);
  if (target.origin !== base.origin || target.username || target.password || target.hash || target.search ||
      !target.pathname.startsWith(prefix) || !segment || /[/%\\]/.test(segment) || ['.', '..'].includes(segment)) {
    throw new Error('Location is not a grant resource in the configured collection; stop the fixture before rerunning.');
  }
  return target.href;
}
