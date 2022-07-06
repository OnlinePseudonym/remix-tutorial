import { json } from "@remix-run/node";
import type {
  LinksFunction,
  ActionFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import stylesUrl from "~/styles/login.css";
import { login, createUserSession, register } from "~/utils/session.server";
import { db } from "~/utils/db.server";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = () => {
  return {
    title: "Remix Jokes | Login",
    description: "Login to submit your own jokes to Remix Jokes!",
  };
};

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return "Username must be at least 3 characters long";
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters";
  }
}

function validateUrl(url: any) {
  console.log(url);
  let validUrls = ["/jokes", "/", "https://remix.run"];
  if (validUrls.includes(url)) {
    return url;
  }
  return "/jokes";
}

interface ActionData {
  formError?: string;
  fieldErrors?: {
    username: string | undefined;
    password: string | undefined;
  };
  fields?: {
    loginType: string;
    username: string;
    password: string;
  };
}

const badRequest = (data: ActionData) => json(data, { status: 400 });

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const loginType = form.get("loginType");
  const username = form.get("username");
  const password = form.get("password");
  const redirectTo = validateUrl(form.get("redirectTo"));

  if (
    typeof loginType !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof redirectTo !== "string"
  ) {
    return badRequest({ formError: "Form not submitted correctly." });
  }

  const fieldErrors = {
    username: validateUsername(username),
    password: validatePassword(password),
  };

  const fields = { username, password, loginType };
  if (Object.values(fieldErrors).some(Boolean)) {
    return badRequest({ fieldErrors, fields });
  }

  switch (loginType) {
    case "login": {
      const userExists = await db.user.findFirst({
        where: { username },
      });

      if (!userExists) {
        return badRequest({
          fields,
          formError: `No User with username ${username} exists`,
        });
      }

      const user = await login({ username, password });
      console.log(user);

      if (!user) {
        return badRequest({
          fields,
          formError: "Username/Password combination is incorrect",
        });
      }

      return createUserSession(user.id, redirectTo);
    }

    case "register": {
      const userExists = await db.user.findFirst({
        where: { username },
      });

      if (userExists) {
        return badRequest({
          fields,
          formError: `User with username ${username} already exists`,
        });
      }

      const user = await register({ username, password });
      return createUserSession(user.id, "/jokes");
    }
    default: {
      return badRequest({
        fields,
        formError: "Login type invalid",
      });
    }
  }
};

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <Form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? undefined}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label htmlFor="loginType">
              <input
                type="radio"
                name="loginType"
                id="loginType"
                value="login"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label htmlFor="loginType">
              <input
                type="radio"
                name="loginType"
                id="loginType"
                value="register"
                defaultChecked={actionData?.fields?.loginType === "register"}
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              name="username"
              id="username-input"
              defaultValue={actionData?.fields?.username}
              aria-invalid={
                Boolean(actionData?.fieldErrors?.username) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.username ? "username-error" : undefined
              }
            />
            {actionData?.fieldErrors?.username && (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData.fieldErrors.username}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              type="password"
              name="password"
              id="password-input"
              defaultValue={actionData?.fields?.password}
              aria-invalid={
                Boolean(actionData?.fieldErrors?.password) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.password ? "password-error" : undefined
              }
            />
            {actionData?.fieldErrors?.password && (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData.fieldErrors.password}
              </p>
            )}
          </div>
          {actionData?.formError && (
            <p className="form-validation-error" role="alert">
              {actionData.formError}
            </p>
          )}
          <button type="submit" className="button">
            Submit
          </button>
        </Form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
