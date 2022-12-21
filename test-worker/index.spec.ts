import { fetch } from "./index"

test("should redirect to example page on no route match", async () => {
	const env = await getMiniflareBindings()
	const res = await fetch(new Request("http://localhost"), env)
	expect(res.status).toBe(404)
})
