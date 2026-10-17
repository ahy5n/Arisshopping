import { boohooGroupAdapter } from "./_boohoo-group";

export default boohooGroupAdapter({
  id: "debenhams",
  name: "Debenhams",
  tier: "premium",
  index: "debenhams-dbz-prod",
  site: "www.debenhams.com",
  marketplace: true, // most of Debenhams is other sellers' stock
});
