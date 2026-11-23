import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import Avatar from "@/components/Avatar";
import ProfileForm from "@/components/ProfileForm";
import type { Profile } from "@/lib/profile";

// Only the two calls that talk to Firebase are faked; validation and messages are real
const updateProfileDetails = vi.fn();
vi.mock("@/lib/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/profile")>()),
  updateProfileDetails: (...args: unknown[]) => updateProfileDetails(...args),
}));
const updateProfile = vi.fn();
vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/auth")>()),
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

const profile: Profile = { name: "Chris", email: "chris@example.com", gender: "male" };

function googleUser(photoURL: string | null = "https://lh3.googleusercontent.com/a/photo"): User {
  return {
    uid: "chris-uid",
    displayName: "Chris",
    photoURL,
    providerData: [{ providerId: "google.com" }],
  } as unknown as User;
}

function setup(user = googleUser()) {
  const onSaved = vi.fn();
  const view = userEvent.setup();
  render(<ProfileForm user={user} profile={profile} onSaved={onSaved} />);
  return { view, onSaved, nameInput: screen.getByRole("textbox", { name: "Name" }) };
}

afterEach(() => {
  updateProfileDetails.mockReset();
  updateProfile.mockReset();
});

describe("ProfileForm", () => {
  it("shows the photo, name, email and gender", () => {
    setup();
    expect(screen.getByTestId("avatar").querySelector("img")).toHaveAttribute(
      "src",
      "https://lh3.googleusercontent.com/a/photo"
    );
    expect(screen.getAllByText("chris@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Chris");
    expect(screen.getByRole("button", { name: /Gender/ })).toHaveTextContent("Male");
  });

  it("keeps Save disabled until something changes", async () => {
    const { view, nameInput } = setup();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    await view.type(nameInput, "topher");
    expect(save).toBeEnabled();
  });

  it("shows the error under the name field and doesn't save an empty name", async () => {
    const { view, nameInput } = setup();
    await view.clear(nameInput);
    await view.type(nameInput, " ");
    await view.click(screen.getByRole("button", { name: "Save changes" }));

    expect(nameInput).toHaveAccessibleDescription("Please enter your name.");
    expect(updateProfileDetails).not.toHaveBeenCalled();
  });

  it("saves to Firestore, then the Auth display name, then refreshes the app's profile", async () => {
    updateProfileDetails.mockResolvedValue(undefined);
    updateProfile.mockResolvedValue(undefined);
    const user = googleUser();
    const { view, onSaved, nameInput } = setup(user);

    await view.clear(nameInput);
    await view.type(nameInput, "Christopher  ");
    await view.click(screen.getByRole("button", { name: /Gender/ }));
    await view.click(screen.getByRole("option", { name: "Prefer not to say" }));
    await view.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
    expect(updateProfileDetails).toHaveBeenCalledWith("chris-uid", { name: "Christopher", gender: "prefer-not-to-say" });
    expect(updateProfile).toHaveBeenCalledWith(user, { displayName: "Christopher" });
    expect(onSaved).toHaveBeenCalledWith({ ...profile, name: "Christopher", gender: "prefer-not-to-say" });
  });

  it("says why saving failed, next to the button, and keeps what was typed", async () => {
    updateProfileDetails.mockRejectedValue({ code: "unavailable" });
    const { view, onSaved, nameInput } = setup();

    await view.type(nameInput, "topher");
    await view.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save your profile. The connection is too slow right now."
    );
    expect(nameInput).toHaveValue("Christopher");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("still counts as saved if only the Auth display name update fails", async () => {
    updateProfileDetails.mockResolvedValue(undefined);
    updateProfile.mockRejectedValue(new Error("auth down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { view, onSaved, nameInput } = setup();

    await view.type(nameInput, "topher");
    await view.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });
});

describe("Avatar", () => {
  it("shows the initial when there's no photo (email sign-ups)", () => {
    render(<Avatar photoURL={null} name="chris" />);
    expect(screen.getByTestId("avatar")).toHaveTextContent("C");
    expect(screen.getByTestId("avatar").querySelector("img")).toBeNull();
  });

  it("falls back to the initial when the photo fails to load", () => {
    render(<Avatar photoURL="https://example.com/broken.jpg" name="Ada" />);
    fireEvent.error(screen.getByTestId("avatar").querySelector("img") as HTMLImageElement);
    expect(screen.getByTestId("avatar")).toHaveTextContent("A");
  });
});
