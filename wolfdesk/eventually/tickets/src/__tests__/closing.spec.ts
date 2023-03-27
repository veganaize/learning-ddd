import { app, broker, client, dispose, sleep } from "@rotorsoft/eventually";
import { Ticket } from "../ticket.aggregate";
import { Chance } from "chance";
import { openTicket, target } from "./commands";
import { Closing } from "../closing.policy";
import { Tickets } from "../ticket.projector";
import { Priority } from "../ticket.schemas";

const chance = new Chance();

describe("closing policy", () => {
  beforeAll(() => {
    app().with(Ticket).with(Tickets).with(Closing).build();
  });

  afterAll(async () => {
    await dispose()();
  });

  it("should close ticket", async () => {
    const t = target();
    await openTicket(
      t,
      "assign me",
      "Opening a new ticket",
      chance.guid(),
      chance.guid(),
      Priority.High,
      new Date()
    );
    await broker().drain();

    await client().event(Closing, {
      name: "CheckInactiveTicketsCronTriggered",
      data: {},
      id: 0,
      stream: "",
      version: 0,
      created: new Date(),
      metadata: { correlation: "", causation: {} },
    });
    await broker().drain();

    const snapshot = await client().load(Ticket, t.stream || "");
    expect(snapshot.state.closedById).toBeDefined();
  });
});
