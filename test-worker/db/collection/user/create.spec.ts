import { TestSetup } from "../../../Context/TestSetup"
import * as model from "../../../model"

describe.each(TestSetup.partitions)("Collection with $partitions partitions, create", ({ collection }) => {
	it(`one`, async () => {
		const created = await collection?.store(TestSetup.user)
		expect(model.User.is(created)).toBeTruthy()
	})
	it(`one twice`, async () => {
		await collection?.store(TestSetup.user)
		const created = await collection?.store(TestSetup.user)
		expect(created).toBeUndefined()
	})
	it(`many`, async () => {
		const created = await collection?.store(TestSetup.collectionUsers)
		expect(created?.every(model.User.is)).toBeTruthy()
	})
	it(`many twice`, async () => {
		await collection?.store(TestSetup.collectionUsers)
		const created = await collection?.store(TestSetup.collectionUsers)
		expect(created).toMatchObject([])
	})
})
