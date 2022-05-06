import request from "supertest";
import server from "./server";

describe("GET /users", function () {
  it("responds with json", (done) => {
    server.start().then((app) => {
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
});
