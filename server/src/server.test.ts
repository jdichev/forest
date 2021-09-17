import request from "supertest";
import server from "./server";

describe("GET /users", function () {
  it("responds with json", async (done) => {
    const app = await server.start();
    return request(app)
      .get("/users")
      .expect("Content-Type", /json/)
      .expect(404)
      .then((response) => {
        expect(response.body.message).toEqual("Not found");

        server.stop();

        return done();
      })
      .catch((err) => done(err));
  });
});
