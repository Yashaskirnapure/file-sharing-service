export type File = {
	id: string;
	filename: string;
	contentType: string;
	size: bigint | null;
	ownerId: string;
	createdAt: Date;
	completedAt?: Date | null;
	deletedAt?: Date | null;
	status: "PENDING" | "AVAILABLE" | "FAILED" | "DELETING" | "DELETED";
};

export type LockedFileRow = Pick<File, "id" | "ownerId">;

export enum FileStatus {
	PENDING = "PENDING",
	AVAILABLE = "AVAILABLE",
	DELETING = "DELETING",
	DELETED = "DELETED",
	FAILED = "FAILED",
}
