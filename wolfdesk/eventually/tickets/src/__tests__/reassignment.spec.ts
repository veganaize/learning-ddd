import { app, client, dispose, sleep } from "@rotorsoft/eventually";
import { Ticket } from "../ticket.aggregate";
import { Chance } from "chance";
import { assignTicket, openTicket } from "./commands";
import { Reassingment } from "../reassignment.policy";
import { Tickets } from "../ticket.projector";

const chance = new Chance();

describe("reassignment policy", () => {
  beforeAll(() => {
    app().with(Ticket).with(Tickets).with(Reassingment).build();
  });

  afterAll(async () => {
    await dispose()();
  });

  it("should reassign", async () => {
    const ticketId = chance.guid();
    await openTicket(ticketId, "assign me", "Opening a new ticket");
    await assignTicket(ticketId, chance.guid(), new Date(), new Date());
    await client().event(Reassingment, {
      name: "ReassignmentCronTriggered",
      data: {},
      id: 0,
      stream: "",
      version: 0,
      created: new Date(),
      metadata: { correlation: "", causation: {} },
    });
    await sleep(1000);
    const snapshot = await client().load(Ticket, ticketId);
    expect(snapshot.state.agentId).toBeDefined();
    expect(snapshot.state.reassignAfter?.getTime()).toBeGreaterThan(Date.now());
    expect(snapshot.state.escalateAfter?.getTime()).toBeGreaterThan(Date.now());
  });
});