import { json } from "@remix-run/node";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import type { Joke } from "@prisma/client";
import { db } from "~/utils/db.server";
import { useLoaderData, useCatch, useParams } from "@remix-run/react";
import { JokeDisplay } from "~/components/joke";
import { getUserId } from "~/utils/session.server";

export const meta: MetaFunction = ({ data }: { data?: LoaderData }) => {
  if (!data) {
    return {
      title: "No joke",
      description: "No joke found",
    };
  }
  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`,
  };
};

interface LoaderData {
  joke: Joke;
  isOwner: boolean;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });

  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }

  const isOwner = joke.jokesterId === userId;
  const data = { joke, isOwner };

  return json(data);
};

export default function JokeRoute() {
  const { joke, isOwner } = useLoaderData<LoaderData>();

  return <JokeDisplay joke={joke} isOwner={isOwner} />;
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">
      {`There was an error loading joke by the id ${jokeId}. Sorry.`}
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();

  if (caught.status === 404) {
    return (
      <div className="error-container">
        Huh? What the heck is "{params.jokeId}"?
      </div>
    );
  }

  throw new Error(`Unhandled error: ${caught.status}`);
}
