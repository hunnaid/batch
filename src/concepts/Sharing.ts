import {
    MongoServerError,
    type Collection,
    type Db,
} from "mongodb";

/**
 * Access information for a resource.
 * The owner is stored separately from the other members.
 */
type ResourceDocument = {
    _id: string;
    owner: string;
    members: string[];
};

/** A resource can only have its sharing state initialized once. */
export class ResourceAlreadyInitialized extends Error {}

/** Access cannot be granted because the resource is unknown. */
export class GrantResourceNotFound extends Error {}

/** Only the resource's owner can grant access. */
export class GrantNotOwner extends Error {}

/** The owner already has access and cannot be added as a member. */
export class CannotGrantOwner extends Error {}

/** The user already belongs to this resource's members. */
export class MemberAlreadyAdded extends Error {}

/** The resource is unknown or the user does not have access. */
export class AccessDenied extends Error {}

/** Access cannot be revoked because the resource is unknown. */
export class RevokeResourceNotFound extends Error {}

/** Only the resource's owner can revoke access. */
export class RevokeNotOwner extends Error {}

/** The owner's access cannot be removed through membership changes. */
export class CannotRevokeOwner extends Error {}

/** The user is not a member of this resource. */
export class MemberNotAdded extends Error {}

/**
 * Manages resource ownership and membership independently of its contents.
 */
export class SharingConcept {
    private readonly resources: Collection<ResourceDocument>;

    /**
     * Select this concept's storage without performing a database operation.
     * @param db - The database used to store resource access information.
     */
    constructor(db: Db) {
        this.resources = db.collection<ResourceDocument>("sharing.resources");
    }

    /**
     * Establishes ownership of a resource with no additional members.
     *
     * @param input - The existing resource identifier and its owner.
     * @returns An empty action result when initialization succeeds.
     * @throws ResourceAlreadyInitialized if sharing is already initialized.
     */
    async initialize({
        resource,
        owner,
    }: {
        resource: string;
        owner: string;
    }): Promise<{}> {
        try {
            await this.resources.insertOne({
                _id: resource,
                owner,
                members: [],
            });
        } catch (error) {
        // The unique _id prevents simultaneous initialization from
        // replacing a resource's existing owner or membership.
            if (
                error instanceof MongoServerError &&
                error.code === 11000 &&
                error.keyPattern?._id === 1
            ) {
                throw new ResourceAlreadyInitialized(
                "Sharing is already initialized for this resource."
                );
            }

            throw error;
        }

        return {};
    }

    /**
     * Gives another user access to a resource.
     *
     * @param input - The owner, resource, and user receiving access.
     * @returns An empty action result when access is granted.
     * @throws GrantResourceNotFound if the resource is not initialized.
     * @throws GrantNotOwner if the supplied owner does not own the resource.
     * @throws CannotGrantOwner if the member is the resource's owner.
     * @throws MemberAlreadyAdded if the member already has access.
     */
    async grant({
        owner,
        resource,
        member,
    }: {
        owner: string;
        resource: string;
        member: string;
    }): Promise<{}> {
        const existing = await this.resources.findOne({ _id: resource });

        if (!existing) {
            throw new GrantResourceNotFound("The resource does not exist.");
        }

        if (existing.owner !== owner) {
            throw new GrantNotOwner("Only the owner can grant access.");
        }

        if (member === existing.owner) {
            throw new CannotGrantOwner("The owner already has access.");
        }

        // Add membership atomically so simultaneous grants cannot create duplicates.
        const result = await this.resources.updateOne(
            { _id: resource, owner },
            { $addToSet: { members: member } }
        );

        if (result.modifiedCount === 0) {
            throw new MemberAlreadyAdded("The user already has access.");
        }

        return {};
    }

    /**
     * Checks whether a user is the resource's owner or a member.
     * Successful authorization does not change the stored access information.
     *
     * @param input - The user requesting access and the resource.
     * @returns An empty action result when access is allowed.
     * @throws AccessDenied if the resource is unknown or access is not allowed.
     */
    async authorize({
        user,
        resource,
    }: {
        user: string;
        resource: string;
    }): Promise<{}> {
        const existing = await this.resources.findOne({ _id: resource });

        if (
            !existing ||
            (existing.owner !== user && !existing.members.includes(user))
        ) {
            throw new AccessDenied("You do not have access to this resource.");
        }

        return {};
    }

    /**
     * Removes a member's access while preserving the owner's access.
     *
     * @param input - The owner, resource, and member losing access.
     * @returns An empty action result when access is revoked.
     * @throws RevokeResourceNotFound if the resource is not initialized.
     * @throws RevokeNotOwner if the supplied owner does not own the resource.
     * @throws CannotRevokeOwner if the member is the resource's owner.
     * @throws MemberNotAdded if the user is not a member.
     */
    async revoke({
        owner,
        resource,
        member,
    }: {
        owner: string;
        resource: string;
        member: string;
    }): Promise<{}> {
        const existing = await this.resources.findOne({ _id: resource });

        if (!existing) {
            throw new RevokeResourceNotFound("The resource does not exist.");
        }

        if (existing.owner !== owner) {
            throw new RevokeNotOwner("Only the owner can revoke access.");
        }

        if (member === existing.owner) {
            throw new CannotRevokeOwner("The owner's access cannot be revoked.");
        }

        const result = await this.resources.updateOne(
            { _id: resource, owner },
            { $pull: { members: member } }
        );

        if (result.modifiedCount === 0) {
            throw new MemberNotAdded("The user is not a member of this resource.");
        }

        return {};
    }
}
