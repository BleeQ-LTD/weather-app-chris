import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import ProfileForm from "@/components/ProfileForm";
import type { Profile } from "@/lib/profile";

// Firebase and the canvas resize are faked; the file checks and messages are real
const updateProfilePhoto = vi.fn();
vi.mock("@/lib/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/profile")>()),
  updateProfilePhoto: (...args: unknown[]) => updateProfilePhoto(...args),
}));
const makeAvatar = vi.fn();
vi.mock("@/lib/avatarImage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/avatarImage")>()),
  makeAvatar: (...args: unknown[]) => makeAvatar(...args),
}));

const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const emailUser = { uid: "ada-uid", displayName: "Ada", photoURL: null, providerData: [{ providerId: "password" }] } as unknown as User;

function setup(profile: Profile = { name: "Ada", email: "ada@example.com", gender: "female" }) {
  const onSaved = vi.fn();
  const user = userEvent.setup({ applyAccept: false });
  render(<ProfileForm user={emailUser} profile={profile} onSaved={onSaved} />);
  return { user, onSaved };
}

const imageFile = (type = "image/png", bytes = 2000) => new File([new Uint8Array(bytes)], "me.png", { type });

afterEach(() => {
  updateProfilePhoto.mockReset();
  makeAvatar.mockReset();
});

describe("Profile photo", () => {
  it("lets an email sign-up add a photo, which then shows everywhere", async () => {
    makeAvatar.mockResolvedValue(PHOTO);
    updateProfilePhoto.mockResolvedValue(undefined);
    const { user, onSaved } = setup();
    expect(screen.getByText("Add a photo, or we'll show your initial.")).toBeInTheDocument();

    await user.upload(screen.getByLabelText("Add a photo"), imageFile());

    expect(await screen.findByText("Photo updated")).toBeInTheDocument();
    expect(updateProfilePhoto).toHaveBeenCalledWith("ada-uid", PHOTO);
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ photo: PHOTO }));
  });

  it("says what's wrong with a file that isn't an image, and saves nothing", async () => {
    const { user } = setup();
    await user.upload(screen.getByLabelText("Add a photo"), imageFile("application/pdf"));

    expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPG, PNG, WebP or GIF image.");
    expect(makeAvatar).not.toHaveBeenCalled();
    expect(updateProfilePhoto).not.toHaveBeenCalled();
  });

  it("says when an image can't be read", async () => {
    makeAvatar.mockRejectedValue(new Error("decode failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = setup();
    await user.upload(screen.getByLabelText("Add a photo"), imageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't read that image. Try a different one.");
    expect(updateProfilePhoto).not.toHaveBeenCalled();
  });

  it("gives the real reason when saving fails", async () => {
    makeAvatar.mockResolvedValue(PHOTO);
    updateProfilePhoto.mockRejectedValue({ code: "permission-denied" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user, onSaved } = setup();
    await user.upload(screen.getByLabelText("Add a photo"), imageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save your photo. Something went wrong on our side."
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("removes a photo the user added", async () => {
    updateProfilePhoto.mockResolvedValue(undefined);
    const { user, onSaved } = setup({ name: "Ada", email: "ada@example.com", gender: "female", photo: PHOTO });
    expect(screen.getByLabelText("Change photo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove photo" }));

    expect(await screen.findByText("Photo removed")).toBeInTheDocument();
    expect(updateProfilePhoto).toHaveBeenCalledWith("ada-uid", null);
    expect(onSaved.mock.calls[0][0]).not.toHaveProperty("photo");
  });
});
