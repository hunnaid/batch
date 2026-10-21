import { MongoServerError, type Collection, type Db } from "mongodb";

export type ProfileDetails = { displayName: string; bio: string; picture: string };
export class InvalidProfile extends Error {}
export class ProfileAlreadyExists extends Error {}
export class ProfileNotFound extends Error {}

/** Validate a bounded, embedded raster image rather than a remote URL or executable format. */
function validPicture(picture: string): boolean {
  if (picture === "") return true;
  if (picture.length > 350_000) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(picture);
  if (!match) return false;
  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.length > 256 * 1024 || bytes.toString("base64") !== match[2]) return false;
  switch (match[1]) {
    case "png": return bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes.toString("ascii", 12, 16) === "IHDR";
    case "jpeg": return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 &&
      bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
    case "webp": return bytes.length >= 20 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP" &&
      ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16));
    default: return false;
  }
}

function validate(details: ProfileDetails) {
  if (!details.displayName.trim() || details.displayName.length > 80 ||
      details.bio.length > 500 || !validPicture(details.picture)) {
    throw new InvalidProfile("Use a name of 1–80 characters, a bio of at most 500 characters, and a supported picture up to 256 KiB.");
  }
}

/** Presentation details for generic users, independent of accounts and credentials. */
export class ProfilingConcept {
  private readonly profiles: Collection<ProfileDetails & { _id: string }>;

  constructor(db: Db) {
    this.profiles = db.collection("profiling.profiles");
  }

  /** Create a user's profile without replacing an existing presentation. */
  async create({ user, displayName, bio, picture }: ProfileDetails & { user: string }): Promise<{}> {
    const details = { displayName, bio, picture };
    validate(details);
    try {
      await this.profiles.insertOne({ _id: user, ...details });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ProfileAlreadyExists("The user already has a profile.");
      }
      throw error;
    }
    return {};
  }

  /** Replace presentation details; empty bio/picture values clear those optional details. */
  async update({ user, displayName, bio, picture }: ProfileDetails & { user: string }): Promise<{}> {
    const details = { displayName, bio, picture };
    validate(details);
    const result = await this.profiles.updateOne({ _id: user }, { $set: details });
    if (result.matchedCount === 0) throw new ProfileNotFound("The profile does not exist.");
    return {};
  }

  /** Return presentation fields only, without interpreting the generic user identifier. */
  async _get({ user }: { user: string }): Promise<ProfileDetails[]> {
    const profile = await this.profiles.findOne({ _id: user });
    return profile ? [{ displayName: profile.displayName, bio: profile.bio, picture: profile.picture }] : [];
  }
}
