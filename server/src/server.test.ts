import request from "supertest";
import server from "./server";

const app = server.start();

describe("GET /users", function () {
  it("responds with json", function (done) {
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
