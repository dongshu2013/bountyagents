"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth";
import { Pagination } from "../../components/Pagination";
import { TASK_SERVICE_URL } from "../../config";

const timeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const mapStatus = (status: string) => {
  switch (status) {
    case "active":
      return "open";
    case "pending_review":
      return "progress";
    case "finished":
    case "closed":
      return "complete";
    default:
      return status;
  }
};

export default function MinePage() {
  const [activeTab, setActiveTab] = useState<"created" | "responses">("created");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const address = useAuthStore((state) => state.address);
  const token = useAuthStore((state) => state.token);

  // Query for created tasks
  const { data: createdData, isLoading: loadingCreated } = useQuery({
    queryKey: ["my-tasks", address, page],
    queryFn: async () => {
      const url = new URL(`${TASK_SERVICE_URL}/tasks/query`);
      const payload = {
        filter: { publisher: address },
        pageNum: page,
        pageSize: pageSize,
      };

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: activeTab === "created" && !!address,
  });

  // Query for responses
  const { data: responsesData, isLoading: loadingResponses } = useQuery({
    queryKey: ["my-responses", address, page],
    queryFn: async () => {
      const url = new URL(`${TASK_SERVICE_URL}/workers/responses/query`);
      const payload = {
        workerAddress: address,
        token: token,
        pageNum: page,
        pageSize: pageSize,
      };

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to fetch responses");
      return res.json();
    },
    enabled: activeTab === "responses" && !!address && !!token,
  });

  // If not authenticated, we could redirect or show a message
  if (!address) {
    return (
      <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
        <h2>Not Authenticated</h2>
        <p style={{ color: "var(--text-2)", marginTop: "16px" }}>Please connect your wallet to view your bounties.</p>
      </div>
    );
  }

  const totalCount = activeTab === "created" ? createdData?.totalCount : responsesData?.responses?.length || 0; // The API might not return totalCount for responses
  
  const items = activeTab === "created" 
    ? (createdData?.tasks || [])
    : (responsesData?.responses || []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>My Bounties</h1>
        <p>Manage the bounties you&apos;ve posted and your responses.</p>
      </div>

      {/* Tabs */}
      <div className="controls" style={{ marginTop: "32px" }}>
        <div className="filters">
          <button
            className={`filter-btn ${activeTab === "created" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("created");
              setPage(0);
            }}
          >
            Posted Bounties
          </button>
          <button
            className={`filter-btn ${activeTab === "responses" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("responses");
              setPage(0);
            }}
          >
            My Responses
          </button>
        </div>
      </div>

      {/* List Header */}
      <div className="bounty-item-header">
        {activeTab === "created" ? (
          <>
            <div>Bounty</div>
            <div>USDC</div>
            <div>Points</div>
            <div>Status</div>
            <div>Posted</div>
          </>
        ) : (
          <>
            <div>Response ID</div>
            <div>Task ID</div>
            <div>Payload</div>
            <div>Status</div>
            <div>Submitted</div>
          </>
        )}
      </div>

      {/* List */}
      <div className="bounty-list">
        {activeTab === "created" && loadingCreated && <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>}
        {activeTab === "responses" && loadingResponses && <div style={{ padding: "24px", textAlign: "center" }}>Loading...</div>}
        
        {items.length === 0 && !loadingCreated && !loadingResponses && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-3)" }}>
            No {activeTab === "created" ? "bounties posted" : "responses submitted"} yet.
          </div>
        )}

        {activeTab === "created" && items.map((task: { id: string; title: string; content: string; price: string; status: string; created_at: number }) => {
          const mappedStatus = mapStatus(task.status);
          return (
            <div key={task.id} className="bounty-item" style={{ cursor: "default" }}>
              <div>
                <div className="bounty-title">
                  #{task.id.substring(0, 4)} - {task.title}
                </div>
                <div className="bounty-desc">{task.content}</div>
              </div>
              <div>
                <div className="bounty-reward">${(Number(task.price) / 1000000).toFixed(2)}</div>
              </div>
              <div>
                <div className="bounty-reward-crystals">50</div>
              </div>
              <div>
                <span className={`status-pill status-${mappedStatus}`}>
                  {mappedStatus === "progress"
                    ? "In Progress"
                    : mappedStatus.charAt(0).toUpperCase() + mappedStatus.slice(1)}
                </span>
              </div>
              <div className="bounty-date-cell">{timeAgo(task.created_at)}</div>
            </div>
          );
        })}

        {activeTab === "responses" && items.map((response: { id: string; task_id: string; payload: string; status: string; created_at: number }) => {
          return (
            <div key={response.id} className="bounty-item" style={{ cursor: "default" }}>
              <div>
                <div className="bounty-title">
                  #{response.id.substring(0, 8)}
                </div>
              </div>
              <div>
                <div className="bounty-desc" style={{ fontFamily: "monospace" }}>
                  {response.task_id?.substring(0, 8)}...
                </div>
              </div>
              <div>
                <div className="bounty-desc" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {response.payload}
                </div>
              </div>
              <div>
                <span className={`status-pill status-${response.status === 'approved' ? 'complete' : response.status === 'rejected' ? 'open' : 'progress'}`}>
                  {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                </span>
              </div>
              <div className="bounty-date-cell">{timeAgo(response.created_at)}</div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <Pagination
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
