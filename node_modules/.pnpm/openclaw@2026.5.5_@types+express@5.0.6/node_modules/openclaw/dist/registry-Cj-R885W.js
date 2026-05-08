import { c as normalizeOptionalString } from "./string-coerce-Bje8XVt9.js";
import { a as normalizeAnyChannelId } from "./registry-ClLkIT5N.js";
import { n as getBundledChannelPlugin } from "./bundled-DdbF6Bpc.js";
import { n as getLoadedChannelPluginEntryById, r as listLoadedChannelPlugins, t as getLoadedChannelPluginById } from "./registry-loaded-DxBLokTx.js";
//#region src/channels/plugins/registry.ts
function listChannelPlugins() {
	return listLoadedChannelPlugins();
}
function getLoadedChannelPlugin(id) {
	const resolvedId = normalizeOptionalString(id) ?? "";
	if (!resolvedId) return;
	return getLoadedChannelPluginById(resolvedId);
}
function getLoadedChannelPluginOrigin(id) {
	const resolvedId = normalizeOptionalString(id) ?? "";
	if (!resolvedId) return;
	return normalizeOptionalString(getLoadedChannelPluginEntryById(resolvedId)?.origin) ?? void 0;
}
function getChannelPlugin(id) {
	const resolvedId = normalizeOptionalString(id) ?? "";
	if (!resolvedId) return;
	return getLoadedChannelPlugin(resolvedId) ?? getBundledChannelPlugin(resolvedId);
}
function normalizeChannelId(raw) {
	return normalizeAnyChannelId(raw);
}
//#endregion
export { normalizeChannelId as a, listChannelPlugins as i, getLoadedChannelPlugin as n, getLoadedChannelPluginOrigin as r, getChannelPlugin as t };
